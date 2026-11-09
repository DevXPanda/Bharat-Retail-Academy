import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, noContent, ok } from '../../utils/response.js';
import * as service from './batches.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listBatches(req.user, req.query);
  ok(res, items, meta);
});

export const options = asyncHandler(async (req, res) => ok(res, await service.batchOptions(req.user, req.query.course)));
export const summary = asyncHandler(async (_req, res) => ok(res, await service.batchesSummary()));
export const upcoming = asyncHandler(async (_req, res) => ok(res, await service.upcomingBatches()));
export const getOne = asyncHandler(async (req, res) => ok(res, await service.getBatch(req.params.id, req.user)));
export const create = asyncHandler(async (req, res) => created(res, await service.createBatch(req.body)));
export const update = asyncHandler(async (req, res) => ok(res, await service.updateBatch(req.params.id, req.body)));

export const remove = asyncHandler(async (req, res) => {
  await service.deleteBatch(req.params.id);
  noContent(res);
});

export const assignStudents = asyncHandler(async (req, res) => ok(res, await service.assignStudents(req.params.id, req.body.studentIds)));

export const removeStudent = asyncHandler(async (req, res) => {
  await service.removeStudent(req.params.id, req.params.studentId);
  noContent(res);
});

export const bulk = asyncHandler(async (req, res) => ok(res, await service.bulk(req.body.ids, req.body.action)));
