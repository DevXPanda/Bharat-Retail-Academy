import Recording from '../../models/Recording.js';
import RecordingView from '../../models/RecordingView.js';
import Enrollment from '../../models/Enrollment.js';
import User from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { dateRangeFilter, mergeFilters, paginate, searchFilter } from '../../utils/query.js';
import { notifyUsers } from '../../services/notify.js';
import { studentCourseIds } from '../../services/scope.js';

const POPULATE = [
  { path: 'course', select: 'title category' },
  { path: 'batch', select: 'name' },
  { path: 'teacher', select: 'name avatar' },
];

async function actorScope(actor) {
  if (actor.role === 'admin') return null;
  if (actor.role === 'teacher') return { teacher: actor._id };
  return { course: { $in: await studentCourseIds(actor._id) }, status: 'published' };
}

export async function listRecordings(actor, query) {
  const filter = mergeFilters(
    await actorScope(actor),
    query.course ? { course: query.course } : null,
    query.batch ? { batch: query.batch } : null,
    actor.role === 'admin' && query.teacher ? { teacher: query.teacher } : null,
    query.status && query.status !== 'all' ? { status: query.status } : null,
    dateRangeFilter('classDate', query.from, query.to),
    searchFilter(['title'], query.search),
  );
  return paginate(Recording, filter, { page: query.page, limit: query.limit, sort: { classDate: -1 }, populate: POPULATE });
}

export async function recordingsSummary(actor) {
  const scope = (await actorScope(actor)) || {};
  const [total, published, processing, unpublished, archived] = await Promise.all(
    [{}, { status: 'published' }, { status: 'processing' }, { status: 'unpublished' }, { status: 'archived' }].map((f) => Recording.countDocuments({ ...scope, ...f })),
  );
  return { total: { value: total }, published: { value: published }, processing: { value: processing }, unpublished: { value: unpublished }, archived: { value: archived } };
}

export async function recordingsSidebar() {
  const [recent, processing] = await Promise.all([
    Recording.find().sort({ createdAt: -1 }).limit(4).populate(POPULATE),
    Recording.find({ status: 'processing' }).sort({ updatedAt: -1 }).limit(4).populate(POPULATE),
  ]);
  return { recent, processing };
}

export async function createRecording(actor, payload) {
  const teacherId = actor.role === 'teacher' ? actor._id : payload.teacher;
  if (!teacherId) throw ApiError.badRequest('Select a teacher');
  if (actor.role === 'teacher') {
    const me = await User.findById(actor._id);
    if (me.teacher?.permissions?.uploadRecordings === false) throw ApiError.forbidden('You are not allowed to upload recordings');
  }
  const recording = await Recording.create({ ...payload, teacher: teacherId });
  if (recording.status === 'published') await notifyStudents(recording);
  return recording.populate(POPULATE);
}

async function notifyStudents(recording) {
  const students = await Enrollment.distinct('student', { course: recording.course, status: { $in: ['active', 'completed'] } });
  await notifyUsers(students, { title: 'New class recording', body: recording.title, type: 'recording', link: '/app/recordings' });
}

async function loadOwned(id, actor) {
  const recording = await Recording.findById(id);
  if (!recording) throw ApiError.notFound('Recording not found');
  if (actor.role === 'teacher' && String(recording.teacher) !== String(actor._id)) throw ApiError.forbidden();
  return recording;
}

export async function updateRecording(id, actor, payload) {
  const recording = await loadOwned(id, actor);
  const wasPublished = recording.status === 'published';
  Object.assign(recording, payload);
  await recording.save();
  if (!wasPublished && recording.status === 'published') await notifyStudents(recording);
  return recording.populate(POPULATE);
}

export async function deleteRecording(id, actor) {
  const recording = await loadOwned(id, actor);
  await recording.deleteOne();
}

export async function bulkAction(ids, action, actor) {
  const owned = actor.role === 'teacher' ? { teacher: actor._id } : {};
  if (action === 'delete') {
    const result = await Recording.deleteMany({ _id: { $in: ids }, ...owned });
    return { affected: result.deletedCount };
  }
  const status = { publish: 'published', unpublish: 'unpublished', archive: 'archived' }[action];
  const result = await Recording.updateMany({ _id: { $in: ids }, ...owned }, { status });
  return { affected: result.modifiedCount };
}

export async function registerView(id, actor) {
  const filter = mergeFilters({ _id: id }, await actorScope(actor));
  const recording = await Recording.findOneAndUpdate(filter, { $inc: { views: 1 } }, { new: true });
  if (!recording) throw ApiError.notFound('Recording not found');
  if (actor.role === 'student') {
    await RecordingView.updateOne({ recording: recording._id, student: actor._id }, { $inc: { count: 1 }, $set: { lastViewedAt: new Date() }, $setOnInsert: { firstViewedAt: new Date() } }, { upsert: true });
  }
  return { views: recording.views };
}
