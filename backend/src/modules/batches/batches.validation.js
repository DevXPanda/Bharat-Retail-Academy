import { z } from 'zod';
import { listQuerySchema } from '../../utils/query.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const listBatchesQuery = listQuerySchema.extend({
  course: objectId.optional(),
  teacher: objectId.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const createBatchBody = z
  .object({
    name: z.string().trim().min(2).max(80),
    timing: z.string().trim().max(60).optional(),
    course: objectId,
    teacher: objectId,
    capacity: z.coerce.number().int().min(1).default(50),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    status: z.enum(['draft', 'upcoming']).default('upcoming'),
  })
  .refine((v) => v.endDate > v.startDate, { path: ['endDate'], message: 'End date must be after start date' });

export const updateBatchBody = z
  .object({
    name: z.string().trim().min(2).max(80),
    timing: z.string().trim().max(60),
    course: objectId,
    teacher: objectId,
    capacity: z.coerce.number().int().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    status: z.enum(['draft', 'upcoming']),
  })
  .partial();

export const assignStudentsBody = z.object({ studentIds: z.array(objectId).min(1) });
export const bulkBody = z.object({ ids: z.array(objectId).min(1), action: z.enum(['delete', 'draft', 'publish']) });

export const idParam = z.object({ id: objectId });
export const studentParam = z.object({ id: objectId, studentId: objectId });
