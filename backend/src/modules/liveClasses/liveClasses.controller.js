import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, noContent, ok } from '../../utils/response.js';
import * as service from './liveClasses.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listClasses(req.user, req.query);
  ok(res, items, meta);
});

export const summary = asyncHandler(async (req, res) => ok(res, await service.classesSummary(req.user)));
export const upcoming = asyncHandler(async (req, res) => ok(res, await service.upcomingClasses(req.user)));
export const today = asyncHandler(async (req, res) => ok(res, await service.todaySchedule(req.user)));
export const getOne = asyncHandler(async (req, res) => ok(res, await service.getClass(req.params.id, req.user)));
export const students = asyncHandler(async (req, res) => ok(res, await service.classStudents(req.params.id, req.user)));
export const create = asyncHandler(async (req, res) => created(res, await service.createClass(req.user, req.body)));
export const update = asyncHandler(async (req, res) => ok(res, await service.updateClass(req.params.id, req.user, req.body)));
export const start = asyncHandler(async (req, res) => ok(res, await service.startClass(req.params.id, req.user)));
export const end = asyncHandler(async (req, res) => ok(res, await service.endClass(req.params.id, req.user)));
export const access = asyncHandler(async (req, res) => ok(res, await service.classAccess(req.params.id, req.user)));
export const join = asyncHandler(async (req, res) => ok(res, await service.joinClass(req.params.id, req.user)));

export const leave = asyncHandler(async (req, res) => {
  await service.leaveClass(req.params.id, req.user);
  noContent(res);
});

export const chat = asyncHandler(async (req, res) => ok(res, await service.chatHistory(req.params.id, req.user)));
export const postChat = asyncHandler(async (req, res) => created(res, await service.postChat(req.params.id, req.user, req.body)));
