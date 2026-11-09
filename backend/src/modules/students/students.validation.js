import { z } from 'zod';
import { listQuerySchema } from '../../utils/query.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const listStudentsQuery = listQuerySchema.extend({
  course: objectId.optional(),
  batch: objectId.optional(),
  joinedFrom: z.string().optional(),
  joinedTo: z.string().optional(),
});

export const rosterQuery = listQuerySchema.extend({
  course: objectId.optional(),
  batch: objectId.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const groupsQuery = z.object({ by: z.enum(['course', 'batch']).default('course') });

export const createStudentBody = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, 'Enter a valid phone number').optional().or(z.literal('')),
  courseId: objectId.optional().or(z.literal('')),
  accessStart: z.coerce.date().optional().or(z.literal('').transform(() => undefined)),
  accessEnd: z.coerce.date().optional().or(z.literal('').transform(() => undefined)),
  status: z.enum(['active', 'pending', 'inactive']).default('active'),
});

export const updateStudentBody = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email(),
    phone: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/),
    status: z.enum(['active', 'pending', 'inactive']),
  })
  .partial();

export const enrollBody = z.object({
  courseId: objectId,
  batchId: objectId.optional(),
  accessStart: z.coerce.date().optional(),
  accessEnd: z.coerce.date().optional(),
});

export const idParam = z.object({ id: objectId });
export const enrollmentParam = z.object({ id: objectId, enrollmentId: objectId });
