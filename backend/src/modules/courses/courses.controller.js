import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, noContent, ok } from '../../utils/response.js';
import * as service from './courses.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listCourses(req.user, req.query);
  ok(res, items, meta);
});

export const options = asyncHandler(async (req, res) => ok(res, await service.courseOptions(req.user)));

export const summary = asyncHandler(async (_req, res) => ok(res, await service.coursesSummary()));

export const getOne = asyncHandler(async (req, res) => ok(res, await service.getCourse(req.params.id, req.user)));

export const create = asyncHandler(async (req, res) => created(res, await service.createCourse(req.body)));

export const update = asyncHandler(async (req, res) => ok(res, await service.updateCourse(req.params.id, req.body)));

export const remove = asyncHandler(async (req, res) => {
  await service.deleteCourse(req.params.id);
  noContent(res);
});

export const review = asyncHandler(async (req, res) => ok(res, await service.addReview(req.params.id, req.user, req.body)));

export const students = asyncHandler(async (req, res) => ok(res, await service.courseStudents(req.params.id, req.user)));
