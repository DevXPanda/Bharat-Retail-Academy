import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { sendExcel } from '../../utils/excel.js';
import * as service from './reports.service.js';

const thisYear = new Date().getFullYear();
const yearQuery = z.object({ year: z.coerce.number().int().min(2000).max(2100).default(thisYear) });
const yearlyQuery = z.object({ from: z.coerce.number().int().min(2000).default(thisYear - 5), to: z.coerce.number().int().max(2100).default(thisYear) });
const seriesQuery = yearQuery.extend({ type: z.enum(['students', 'teachers', 'courses', 'payments', 'revenue']) });

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/overview', validate({ query: yearQuery }), asyncHandler(async (req, res) => ok(res, await service.overview(req.query.year))));
router.get('/monthly', validate({ query: yearQuery }), asyncHandler(async (req, res) => ok(res, await service.monthlyReport(req.query.year))));
router.get('/yearly', validate({ query: yearlyQuery }), asyncHandler(async (req, res) => ok(res, await service.yearlyReport(req.query.from, req.query.to))));
router.get('/series', validate({ query: seriesQuery }), asyncHandler(async (req, res) => ok(res, await service.seriesReport(req.query.type, req.query.year))));
router.get('/top-courses', asyncHandler(async (_req, res) => ok(res, await service.topCourses())));
router.get('/top-teachers', asyncHandler(async (_req, res) => ok(res, await service.topTeachersReport())));

router.get(
  '/export',
  validate({ query: z.object({ type: z.enum(['monthly', 'yearly']).default('monthly'), year: z.coerce.number().default(thisYear), from: z.coerce.number().default(thisYear - 5), to: z.coerce.number().default(thisYear) }) }),
  asyncHandler(async (req, res) => {
    const monthly = req.query.type === 'monthly';
    const { rows } = monthly ? await service.monthlyReport(req.query.year) : await service.yearlyReport(req.query.from, req.query.to);
    await sendExcel(res, {
      filename: `${req.query.type}-report.xlsx`,
      title: monthly ? `Monthly payment & revenue report - ${req.query.year}` : 'Yearly payment & revenue report',
      rows,
      columns: [
        { label: monthly ? 'Month' : 'Year', value: (r) => (monthly ? r.month : r.year) },
        { label: 'New Students', value: (r) => r.newStudents, format: 'number', total: true },
        { label: 'Top Course', value: (r) => r.topCourse },
        { label: 'Payments', value: (r) => r.payments, format: 'currency', total: true },
        { label: 'GST', value: (r) => r.gst, format: 'currency', total: true },
        { label: 'Total Classes', value: (r) => r.classes, format: 'number', total: true },
        { label: 'Teacher Payouts', value: (r) => r.teacherPayouts, format: 'currency', total: true },
        { label: 'Refunds', value: (r) => r.refunds, format: 'currency', total: true },
        { label: 'Net Revenue', value: (r) => r.net, format: 'currency', total: true },
      ],
    });
  }),
);

export default router;
