import { z } from 'zod';
import { CLASS_PLATFORMS } from '../../config/constants.js';
import { listQuerySchema } from '../../utils/query.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const listClassesQuery = listQuerySchema.extend({
  course: objectId.optional(),
  batch: objectId.optional(),
  teacher: objectId.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const createClassBody = z
  .object({
    title: z.string().trim().min(3).max(120),
    topic: z.string().trim().max(120).optional(),
    description: z.string().max(1000).optional(),
    course: objectId,
    batch: objectId.optional().or(z.literal('').transform(() => undefined)),
    teacher: objectId.optional().or(z.literal('').transform(() => undefined)),
    startsAt: z.coerce.date(),
    durationMin: z.coerce.number().int().min(5).max(480).default(60),
    maxStudents: z.coerce.number().int().min(1).default(100),
    platform: z.enum(CLASS_PLATFORMS).default('jitsi'),
    meetingLink: z.string().trim().url().optional().or(z.literal('')),
    notifyStudents: z.boolean().default(true),
    isFreeDemo: z.boolean().default(false),
  })
  .refine((v) => v.platform === 'jitsi' || v.meetingLink, { path: ['meetingLink'], message: 'Meeting link is required for Zoom and Google Meet' });

export const updateClassBody = z
  .object({
    title: z.string().trim().min(3).max(120),
    topic: z.string().trim().max(120),
    description: z.string().max(1000),
    batch: objectId.nullable(),
    teacher: objectId,
    startsAt: z.coerce.date(),
    durationMin: z.coerce.number().int().min(5).max(480),
    maxStudents: z.coerce.number().int().min(1),
    platform: z.enum(CLASS_PLATFORMS),
    meetingLink: z.string().trim().url().or(z.literal('')),
    isFreeDemo: z.boolean(),
    status: z.literal('cancelled'),
  })
  .partial();

export const chatBody = z.object({ text: z.string().trim().min(1).max(1000), kind: z.enum(['chat', 'qa']).default('chat') });

export const idParam = z.object({ id: objectId });
