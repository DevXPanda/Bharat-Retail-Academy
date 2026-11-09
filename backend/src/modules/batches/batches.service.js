import Batch, { deriveBatchStatus } from '../../models/Batch.js';
import Enrollment from '../../models/Enrollment.js';
import LiveClass from '../../models/LiveClass.js';
import { ApiError } from '../../utils/ApiError.js';
import { mergeFilters, paginate, searchFilter } from '../../utils/query.js';
import { enrollStudent } from '../enrollments/enrollment.service.js';

export async function syncBatchStatuses() {
  const now = new Date();
  await Promise.all([
    Batch.updateMany({ status: { $in: ['upcoming', 'active'] }, endDate: { $lt: now } }, { status: 'completed' }),
    Batch.updateMany({ status: 'upcoming', startDate: { $lte: now }, endDate: { $gte: now } }, { status: 'active' }),
  ]);
}

const POPULATE = [
  { path: 'course', select: 'title category thumbnail' },
  { path: 'teacher', select: 'name avatar' },
];

async function withCounts(batches) {
  const counts = await Enrollment.aggregate([
    { $match: { batch: { $in: batches.map((b) => b._id) }, status: { $in: ['active', 'pending', 'completed'] } } },
    { $group: { _id: '$batch', count: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.count]));
  return batches.map((b) => ({ ...b.toJSON(), studentsCount: map.get(String(b._id)) || 0 }));
}

export async function listBatches(actor, query) {
  await syncBatchStatuses();
  const filter = mergeFilters(
    actor.role === 'teacher' ? { teacher: actor._id } : null,
    query.course ? { course: query.course } : null,
    query.teacher ? { teacher: query.teacher } : null,
    query.status && query.status !== 'all' ? { status: query.status } : null,
    query.from ? { endDate: { $gte: new Date(query.from) } } : null,
    query.to ? { startDate: { $lte: new Date(query.to) } } : null,
    searchFilter(['name'], query.search),
  );
  const { items, meta } = await paginate(Batch, filter, { page: query.page, limit: query.limit, sort: { startDate: -1 }, populate: POPULATE });
  return { items: await withCounts(items), meta };
}

export async function batchOptions(actor, courseId) {
  const filter = mergeFilters(actor.role === 'teacher' ? { teacher: actor._id } : null, courseId ? { course: courseId } : null);
  return Batch.find(filter).select('name course status').sort({ startDate: -1 });
}

export async function batchesSummary() {
  await syncBatchStatuses();
  const [draft, upcoming, active, completed] = await Promise.all(
    ['draft', 'upcoming', 'active', 'completed'].map((status) => Batch.countDocuments({ status })),
  );
  return { total: { value: draft + upcoming + active + completed }, active: { value: active }, upcoming: { value: upcoming }, completed: { value: completed }, draft: { value: draft } };
}

export async function upcomingBatches(limit = 3) {
  await syncBatchStatuses();
  const batches = await Batch.find({ status: 'upcoming' }).sort({ startDate: 1 }).limit(limit).populate(POPULATE);
  return withCounts(batches);
}

export async function getBatch(id, actor) {
  const batch = await Batch.findById(id).populate(POPULATE);
  if (!batch) throw ApiError.notFound('Batch not found');
  if (actor.role === 'teacher' && String(batch.teacher._id) !== String(actor._id)) throw ApiError.forbidden();
  const enrollments = await Enrollment.find({ batch: id }).populate('student', 'name email phone avatar studentCode');
  return { ...batch.toJSON(), studentsCount: enrollments.length, students: enrollments.map((e) => ({ enrollmentId: e.id, status: e.status, progress: e.progress, ...e.student?.toJSON() })) };
}

export async function createBatch(payload) {
  const batch = await Batch.create(payload);
  return (await withCounts([await batch.populate(POPULATE)]))[0];
}

export async function updateBatch(id, payload) {
  const batch = await Batch.findById(id);
  if (!batch) throw ApiError.notFound('Batch not found');
  Object.assign(batch, payload);
  if (batch.endDate <= batch.startDate) throw ApiError.badRequest('End date must be after start date');
  if (batch.status !== 'draft') batch.status = deriveBatchStatus(batch);
  await batch.save();
  await LiveClass.updateMany({ batch: id, status: 'upcoming' }, { teacher: batch.teacher });
  return (await withCounts([await batch.populate(POPULATE)]))[0];
}

export async function deleteBatch(id) {
  if (await Enrollment.exists({ batch: id })) throw ApiError.conflict('Batch has students. Remove them or mark it as draft.');
  const batch = await Batch.findByIdAndDelete(id);
  if (!batch) throw ApiError.notFound('Batch not found');
}

export async function assignStudents(batchId, studentIds) {
  const batch = await Batch.findById(batchId);
  if (!batch) throw ApiError.notFound('Batch not found');
  const results = { added: 0, failed: [] };
  for (const studentId of studentIds) {
    try {
      await enrollStudent({ studentId, courseId: batch.course, batchId: batch._id, source: 'admin' });
      results.added += 1;
    } catch (err) {
      results.failed.push({ studentId, reason: err.message });
    }
  }
  return results;
}

export async function removeStudent(batchId, studentId) {
  const result = await Enrollment.updateOne({ batch: batchId, student: studentId }, { $unset: { batch: '' } });
  if (!result.matchedCount) throw ApiError.notFound('Student is not in this batch');
}

export async function bulk(ids, action) {
  if (action === 'delete') {
    const withStudents = await Enrollment.distinct('batch', { batch: { $in: ids } });
    const deletable = ids.filter((id) => !withStudents.some((b) => String(b) === id));
    await Batch.deleteMany({ _id: { $in: deletable } });
    return { affected: deletable.length, skipped: ids.length - deletable.length };
  }
  const status = action === 'draft' ? 'draft' : 'upcoming';
  const result = await Batch.updateMany({ _id: { $in: ids } }, { status });
  await syncBatchStatuses();
  return { affected: result.modifiedCount, skipped: 0 };
}
