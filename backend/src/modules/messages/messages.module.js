import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, ok } from '../../utils/response.js';
import * as service from './messages.service.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParam = z.object({ id: objectId });

const attachment = z.object({ name: z.string(), url: z.string(), size: z.number().optional(), mime: z.string().optional() });

export const conversationsRouter = Router();
conversationsRouter.use(authenticate);

conversationsRouter.get('/summary', asyncHandler(async (req, res) => ok(res, await service.messagesSummary(req.user))));
conversationsRouter.get('/contacts', validate({ query: z.object({ search: z.string().optional() }) }), asyncHandler(async (req, res) => ok(res, await service.contacts(req.user, req.query.search))));

conversationsRouter.get(
  '/',
  validate({ query: z.object({ tab: z.enum(['all', 'unread', 'starred', 'archived', 'students', 'teachers']).default('all'), search: z.string().optional() }) }),
  asyncHandler(async (req, res) => {
    const { rows, counts } = await service.listConversations(req.user, req.query);
    ok(res, rows, { counts });
  }),
);

conversationsRouter.post('/', validate({ body: z.object({ userId: objectId }) }), asyncHandler(async (req, res) => created(res, await service.startConversation(req.user, req.body.userId))));

conversationsRouter.get(
  '/:id/messages',
  validate({ params: idParam, query: z.object({ before: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }) }),
  asyncHandler(async (req, res) => ok(res, await service.getMessages(req.params.id, req.user, req.query))),
);

conversationsRouter.post(
  '/:id/messages',
  validate({ params: idParam, body: z.object({ text: z.string().max(4000).optional(), attachments: z.array(attachment).max(5).optional() }) }),
  asyncHandler(async (req, res) => created(res, await service.sendMessage(req.user, req.params.id, req.body))),
);

conversationsRouter.get('/:id/participant', validate({ params: idParam }), asyncHandler(async (req, res) => ok(res, await service.participantDetails(req.params.id, req.user))));
conversationsRouter.patch('/:id/star', validate({ params: idParam }), asyncHandler(async (req, res) => ok(res, await service.toggleFlag(req.params.id, req.user, 'star'))));
conversationsRouter.patch('/:id/archive', validate({ params: idParam }), asyncHandler(async (req, res) => ok(res, await service.toggleFlag(req.params.id, req.user, 'archive'))));

export const announcementsRouter = Router();
announcementsRouter.use(authenticate, authorize('admin'));

announcementsRouter.get('/', asyncHandler(async (_req, res) => ok(res, await service.listAnnouncements())));
announcementsRouter.post(
  '/',
  validate({
    body: z.object({
      title: z.string().trim().min(3).max(120),
      body: z.string().trim().min(3).max(2000),
      audience: z.enum(['all', 'students', 'teachers']).default('all'),
      scheduledAt: z.coerce.date().optional(),
    }),
  }),
  asyncHandler(async (req, res) => created(res, await service.createAnnouncement(req.user, req.body))),
);
