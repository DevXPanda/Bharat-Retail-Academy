import Course from '../../models/Course.js';
import Enrollment from '../../models/Enrollment.js';
import { Review } from '../../models/Engagement.js';
import { ApiError } from '../../utils/ApiError.js';
import { mergeFilters, paginate, searchFilter } from '../../utils/query.js';
import { slugify } from '../../utils/slug.js';
import { hasCourseAccess, teacherCourseIds } from '../../services/scope.js';

const INSTRUCTOR_FIELDS = 'name avatar teacher.designation teacher.expertise';

export async function uniqueSlug(title, ignoreId) {
  const base = slugify(title);
  let slug = base;
  let n = 1;
  while (await Course.exists({ slug, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

async function withEnrollmentCounts(courses) {
  const counts = await Enrollment.aggregate([
    { $match: { course: { $in: courses.map((c) => c._id) } } },
    { $group: { _id: '$course', count: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.count]));
  return courses.map((c) => ({ ...c.toJSON(), enrolledCount: map.get(String(c._id)) || 0 }));
}

export async function listCourses(actor, query) {
  let scope = null;
  if (actor.role === 'teacher') scope = { _id: { $in: await teacherCourseIds(actor._id) } };
  const filter = mergeFilters(
    scope,
    query.category && query.category !== 'all' ? { category: query.category } : null,
    query.status && query.status !== 'all' ? { status: query.status } : null,
    searchFilter(['title', 'shortDescription'], query.search),
  );
  const { items, meta } = await paginate(Course, filter, {
    page: query.page,
    limit: query.limit,
    sort: { createdAt: -1 },
    populate: [{ path: 'instructor', select: INSTRUCTOR_FIELDS }],
  });
  return { items: await withEnrollmentCounts(items), meta };
}

export async function courseOptions(actor) {
  const filter = actor.role === 'teacher' ? { _id: { $in: await teacherCourseIds(actor._id) } } : {};
  return Course.find(filter).select('title category thumbnail status').sort({ title: 1 });
}

export async function coursesSummary() {
  const [total, published, drafts, enrolled] = await Promise.all([
    Course.countDocuments(),
    Course.countDocuments({ status: 'published' }),
    Course.countDocuments({ status: 'draft' }),
    Enrollment.distinct('student').then((ids) => ids.length),
  ]);
  return { total: { value: total }, published: { value: published }, drafts: { value: drafts }, enrolled: { value: enrolled } };
}

export async function getCourse(id, actor) {
  const course = await Course.findById(id).populate('instructor', INSTRUCTOR_FIELDS).populate('teachers', 'name avatar');
  if (!course) throw ApiError.notFound('Course not found');
  if (actor.role === 'teacher') {
    const own = await teacherCourseIds(actor._id);
    if (!own.some((c) => String(c) === String(course._id))) throw ApiError.forbidden();
  }
  return (await withEnrollmentCounts([course]))[0];
}

export async function createCourse(payload) {
  const slug = await uniqueSlug(payload.title);
  const course = new Course({ ...payload, slug, mrp: payload.mrp || payload.price });
  if (!course.instructor && payload.teachers?.length) course.instructor = payload.teachers[0];
  if (course.instructor && !course.teachers.some((t) => String(t) === String(course.instructor))) course.teachers.push(course.instructor);
  await course.save();
  return course;
}

export async function updateCourse(id, payload) {
  const course = await Course.findById(id);
  if (!course) throw ApiError.notFound('Course not found');
  if (payload.title && payload.title !== course.title) course.slug = await uniqueSlug(payload.title, id);
  Object.assign(course, payload);
  if (payload.modules) course.markModified('modules');
  await course.save();
  return course;
}

export async function setCourseStatus(id, status) {
  return updateCourse(id, { status });
}

export async function deleteCourse(id) {
  if (await Enrollment.exists({ course: id })) throw ApiError.conflict('Students are enrolled in this course. Move it to draft instead.');
  const course = await Course.findByIdAndDelete(id);
  if (!course) throw ApiError.notFound('Course not found');
}

export async function addReview(courseId, student, { rating, comment }) {
  if (!(await hasCourseAccess(student._id, courseId))) throw ApiError.forbidden('Enroll in this course to review it');
  await Review.findOneAndUpdate({ course: courseId, student: student._id }, { rating, comment }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const [agg] = await Review.aggregate([
    { $match: { course: (await Course.findById(courseId))._id } },
    { $group: { _id: '$course', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Course.updateOne({ _id: courseId }, { rating: Math.round((agg?.avg || 0) * 10) / 10, ratingCount: agg?.count || 0 });
  return { rating: agg?.avg || 0, count: agg?.count || 0 };
}
