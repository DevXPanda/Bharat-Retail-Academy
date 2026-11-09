import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, noContent, ok } from '../../utils/response.js';
import * as service from './teachers.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listTeachers(req.query);
  ok(res, items, meta);
});

export const summary = asyncHandler(async (_req, res) => ok(res, await service.teachersSummary()));

export const conversation = asyncHandler(async (req, res) => ok(res, await service.teacherConversation(req.params.id, req.params.conversationId)));

export const create = asyncHandler(async (req, res) => created(res, await service.createTeacher(req.body)));

export const getOne = asyncHandler(async (req, res) => ok(res, await service.getTeacher(req.params.id)));

export const update = asyncHandler(async (req, res) => ok(res, await service.updateTeacher(req.params.id, req.body)));

export const remove = asyncHandler(async (req, res) => {
  await service.deleteTeacher(req.params.id);
  noContent(res);
});
