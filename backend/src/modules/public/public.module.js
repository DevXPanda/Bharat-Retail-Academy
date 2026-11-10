import { Router } from 'express';
import { publicFormLimiter } from '../../middleware/security.js';
import { queueAdminMail } from '../../services/mail/index.js';
import { z } from 'zod';
import Course from '../../models/Course.js';
import User from '../../models/User.js';
import Enrollment from '../../models/Enrollment.js';
import LiveClass from '../../models/LiveClass.js';
import { Lead, Review } from '../../models/Engagement.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { escapeRegex, mergeFilters, paginate } from '../../utils/query.js';
import { created, ok } from '../../utils/response.js';
import { verifyToken } from '../../utils/token.js';
import { verifyPublic } from '../certificates/certificates.service.js';
import { publicBlogRouter } from '../blog/blog.module.js';
import { notifyUsers } from '../../services/notify.js';
import { getSettings, publicSettings } from '../../services/settings.js';

const INSTRUCTOR = 'name avatar teacher.designation teacher.expertise teacher.experienceYears';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
  category: z.string().optional(),
  level: z.string().optional(),
  search: z.string().trim().optional(),
  sort: z.enum(['popular', 'price_asc', 'price_desc', 'newest', 'rating']).default('popular'),
});

const leadBody = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, 'Enter a valid mobile number').optional().or(z.literal('')),
  goal: z.string().max(120).optional(),
  message: z.string().max(1000).optional(),
  source: z.enum(['hero', 'contact', 'newsletter']).default('hero'),
}).refine((b) => b.source === 'newsletter' || b.phone, { message: 'Enter a valid mobile number', path: ['phone'] });

async function enrollmentCounts(ids) {
  const rows = await Enrollment.aggregate([{ $match: { course: { $in: ids } } }, { $group: { _id: '$course', count: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

const sortMap = { popular: { ratingCount: -1, createdAt: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 }, newest: { createdAt: -1 }, rating: { rating: -1 } };

const publicCourse = (course, counts) => ({
  ...course.toJSON(),
  modules: undefined,
  enrolledCount: counts.get(String(course._id)) || 0,
});

const router = Router();

router.use('/blog', publicBlogRouter);

router.get('/settings', asyncHandler(async (_req, res) => ok(res, publicSettings(await getSettings()))));

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [learners, instructors, classesThisMonth, rating, courses] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher', status: 'active' }),
      LiveClass.countDocuments({ startsAt: { $gte: new Date(Date.now() - 30 * 86400000) }, status: { $ne: 'cancelled' } }),
      Course.aggregate([{ $match: { status: 'published', ratingCount: { $gt: 0 } } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: '$ratingCount' } } }]),
      Course.countDocuments({ status: 'published' }),
    ]);
    ok(res, { learners, instructors, classesPerMonth: classesThisMonth, courses, rating: Math.round((rating[0]?.avg || 0) * 10) / 10, reviews: rating[0]?.count || 0 });
  }),
);

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const rows = await Course.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    ok(res, rows.map((r) => ({ name: r._id, count: r.count })));
  }),
);

router.get(
  '/courses',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { page, limit, category, level, search, sort } = req.query;
    const filter = mergeFilters(
      { status: 'published' },
      category && category !== 'all' ? { category } : null,
      level ? { level } : null,
      search ? { $or: [{ title: new RegExp(escapeRegex(search), 'i') }, { shortDescription: new RegExp(escapeRegex(search), 'i') }] } : null,
    );
    const { items, meta } = await paginate(Course, filter, { page, limit, sort: sortMap[sort], populate: [{ path: 'instructor', select: INSTRUCTOR }] });
    const counts = await enrollmentCounts(items.map((c) => c._id));
    ok(res, items.map((c) => publicCourse(c, counts)), meta);
  }),
);

router.get(
  '/courses/:slug',
  asyncHandler(async (req, res) => {
    const course = await Course.findOne({ slug: req.params.slug, status: 'published' }).populate('instructor', INSTRUCTOR);
    if (!course) throw ApiError.notFound('Course not found');
    const [counts, reviews] = await Promise.all([enrollmentCounts([course._id]), Review.find({ course: course._id }).sort({ createdAt: -1 }).limit(6).populate('student', 'name avatar')]);

    let enrolled = false;
    try {
      const header = req.headers.authorization || '';
      if (header.startsWith('Bearer ')) {
        const payload = verifyToken(header.slice(7));
        enrolled = Boolean(await Enrollment.exists({ student: payload.sub, course: course._id, status: { $in: ['active', 'completed'] } }));
      }
    } catch {
      enrolled = false;
    }

    const json = course.toJSON();
    json.modules = json.modules.map((m) => ({
      id: m.id,
      title: m.title,
      lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, type: l.type, durationMin: l.durationMin, isPreview: l.isPreview, url: l.isPreview ? l.url : undefined })),
    }));
    ok(res, { ...json, enrolledCount: counts.get(String(course._id)) || 0, enrolled, reviews });
  }),
);

router.get(
  '/teachers',
  asyncHandler(async (_req, res) => {
    const teachers = await User.find({ role: 'teacher', status: 'active' }).select(INSTRUCTOR).sort({ name: 1 }).limit(24);
    const courses = await Course.find({ status: 'published', instructor: { $in: teachers.map((t) => t._id) } }).select('instructor rating ratingCount title');
    ok(
      res,
      teachers.map((t) => {
        const own = courses.filter((c) => String(c.instructor) === String(t._id));
        const rated = own.filter((c) => c.ratingCount > 0);
        return { ...t.toJSON(), coursesCount: own.length, rating: rated.length ? Math.round((rated.reduce((s, c) => s + c.rating, 0) / rated.length) * 10) / 10 : 0 };
      }),
    );
  }),
);

router.get(
  '/teachers/:id',
  asyncHandler(async (req, res) => {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw ApiError.notFound('Teacher not found');
    const teacher = await User.findOne({ _id: req.params.id, role: 'teacher', status: 'active' }).select(`${INSTRUCTOR} about location teacher.bio teacher.languages teacher.skills teacher.education teacher.certifications teacher.social teacher.company`);
    if (!teacher) throw ApiError.notFound('Teacher not found');
    const courses = await Course.find({ status: 'published', instructor: teacher._id }).sort({ ratingCount: -1 }).populate('instructor', INSTRUCTOR);
    const counts = await enrollmentCounts(courses.map((c) => c._id));
    const rated = courses.filter((c) => c.ratingCount > 0);
    ok(res, {
      ...teacher.toJSON(),
      rating: rated.length ? Math.round((rated.reduce((s, c) => s + c.rating, 0) / rated.length) * 10) / 10 : 0,
      studentsCount: [...counts.values()].reduce((s, n) => s + n, 0),
      courses: courses.map((c) => publicCourse(c, counts)),
    });
  }),
);

router.get(
  '/live-classes/:id',
  asyncHandler(async (req, res) => {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw ApiError.notFound('Class not found');
    const cls = await LiveClass.findById(req.params.id).populate('course', 'title category slug price mrp thumbnail').populate('teacher', 'name avatar teacher.designation');
    if (!cls) throw ApiError.notFound('Class not found');
    ok(res, {
      id: cls.id,
      title: cls.title,
      topic: cls.topic,
      description: cls.description,
      startsAt: cls.startsAt,
      durationMin: cls.durationMin,
      status: cls.status,
      isFreeDemo: Boolean(cls.isFreeDemo),
      course: cls.course,
      teacher: cls.teacher,
    });
  }),
);

router.get(
  '/live-classes',
  asyncHandler(async (_req, res) => {
    const classes = await LiveClass.find({ status: { $in: ['upcoming', 'live'] }, startsAt: { $gte: new Date(Date.now() - 3 * 3600000) } })
      .sort({ startsAt: 1 })
      .limit(9)
      .populate('course', 'title category slug')
      .populate('teacher', 'name avatar');
    ok(res, classes.map((c) => ({ id: c.id, isFreeDemo: Boolean(c.isFreeDemo), title: c.title, startsAt: c.startsAt, durationMin: c.durationMin, status: c.status, course: c.course, teacher: c.teacher })));
  }),
);

router.get('/certificates/:certificateId', asyncHandler(async (req, res) => ok(res, await verifyPublic(req.params.certificateId))));

router.post(
  '/leads',
  publicFormLimiter,
  validate({ body: leadBody }),
  asyncHandler(async (req, res) => {
    const { source, email } = req.body;
    const duplicate = source === 'newsletter' && (await Lead.exists({ email: email.toLowerCase(), source }));
    if (!duplicate) {
      const lead = await Lead.create({ ...req.body, phone: req.body.phone || undefined });
      const admins = await User.distinct('_id', { role: 'admin', status: 'active' });
      await notifyUsers(admins, { title: 'New enquiry', body: `${req.body.name || req.body.email || 'Someone'} sent an enquiry.`, type: 'lead', link: '/leads', section: 'leads', ref: lead.id }).catch(() => {});
      queueAdminMail('adminLead', req.body);
    }
    created(res, { received: true });
  }),
);

export default router;
