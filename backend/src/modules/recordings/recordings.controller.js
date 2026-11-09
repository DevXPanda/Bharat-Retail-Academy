import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, noContent, ok } from '../../utils/response.js';
import * as service from './recordings.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listRecordings(req.user, req.query);
  ok(res, items, meta);
});

export const summary = asyncHandler(async (req, res) => ok(res, await service.recordingsSummary(req.user)));
export const sidebar = asyncHandler(async (_req, res) => ok(res, await service.recordingsSidebar()));
export const create = asyncHandler(async (req, res) => created(res, await service.createRecording(req.user, req.body)));
export const update = asyncHandler(async (req, res) => ok(res, await service.updateRecording(req.params.id, req.user, req.body)));
export const bulk = asyncHandler(async (req, res) => ok(res, await service.bulkAction(req.body.ids, req.body.action, req.user)));
export const view = asyncHandler(async (req, res) => ok(res, await service.registerView(req.params.id, req.user)));

export const remove = asyncHandler(async (req, res) => {
  await service.deleteRecording(req.params.id, req.user);
  noContent(res);
});
