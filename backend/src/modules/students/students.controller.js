import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, noContent, ok } from '../../utils/response.js';
import { sendCsv } from '../../utils/csv.js';
import { formatDate } from '../../utils/format.js';
import { collectPages } from '../../utils/query.js';
import * as service from './students.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listStudents(req.user, req.query);
  ok(res, items, meta);
});

export const summary = asyncHandler(async (_req, res) => ok(res, await service.studentsSummary()));

export const exportCsv = asyncHandler(async (req, res) => {
  const items = await collectPages((page, limit) => service.listStudents(req.user, { ...req.query, page, limit }));
  sendCsv(
    res,
    'students.csv',
    [
      { label: 'Student ID', value: (s) => s.studentCode },
      { label: 'Name', value: (s) => s.name },
      { label: 'Email', value: (s) => s.email },
      { label: 'Phone', value: (s) => s.phone },
      { label: 'Courses', value: (s) => s.enrollments.map((e) => e.course?.title).join(' | ') },
      { label: 'Status', value: (s) => s.status },
      { label: 'Joined', value: (s) => formatDate(s.createdAt) },
    ],
    items,
  );
});

export const conversation = asyncHandler(async (req, res) => ok(res, await service.studentConversation(req.params.id, req.params.conversationId)));

export const create = asyncHandler(async (req, res) => created(res, await service.createStudent(req.body, req.user)));

export const getOne = asyncHandler(async (req, res) => ok(res, await service.getStudent(req.params.id, req.user)));

export const update = asyncHandler(async (req, res) => ok(res, await service.updateStudent(req.params.id, req.body)));

export const remove = asyncHandler(async (req, res) => {
  await service.deleteStudent(req.params.id);
  noContent(res);
});

export const addEnrollment = asyncHandler(async (req, res) => created(res, await service.addEnrollment(req.params.id, req.body)));

export const removeEnrollment = asyncHandler(async (req, res) => {
  await service.removeEnrollment(req.params.id, req.params.enrollmentId);
  noContent(res);
});

export const roster = asyncHandler(async (req, res) => {
  const { items, meta } = await service.roster(req.user, req.query);
  ok(res, items, meta);
});

export const rosterSummary = asyncHandler(async (req, res) => ok(res, await service.rosterSummary(req.user)));

export const rosterGroups = asyncHandler(async (req, res) => ok(res, await service.rosterGroups(req.user, req.query.by)));
