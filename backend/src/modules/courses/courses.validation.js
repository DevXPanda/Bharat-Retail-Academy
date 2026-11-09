import { z } from 'zod';
import { CATEGORIES, COURSE_BADGES, COURSE_LEVELS } from '../../config/constants.js';
import { listQuerySchema } from '../../utils/query.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const listCoursesQuery = listQuerySchema.extend({ category: z.string().optional() });

const lesson = z.object({
  title: z.string().trim().min(1),
  type: z.enum(['video', 'pdf', 'text']).default('video'),
  url: z.string().optional(),
  durationMin: z.coerce.number().min(0).default(0),
  isPreview: z.boolean().default(false),
});

const moduleBody = z.object({ title: z.string().trim().min(1), lessons: z.array(lesson).default([]) });

export const createCourseBody = z.object({
  title: z.string().trim().min(3).max(120),
  shortDescription: z.string().trim().min(10).max(300),
  description: z.string().max(5000).optional(),
  category: z.enum(CATEGORIES),
  thumbnail: z.string().optional(),
  price: z.coerce.number().min(0),
  mrp: z.coerce.number().min(0).optional(),
  level: z.enum(COURSE_LEVELS).optional(),
  language: z.string().optional(),
  badge: z.enum([...COURSE_BADGES, '']).optional(),
  status: z.enum(['published', 'draft']).default('draft'),
  liveClassesCount: z.coerce.number().min(0).optional(),
  instructor: objectId.optional().or(z.literal('').transform(() => undefined)),
  teachers: z.array(objectId).optional(),
  modules: z.array(moduleBody).optional(),
  settings: z.object({ certificate: z.boolean(), accessDays: z.coerce.number().min(1) }).partial().optional(),
});

export const updateCourseBody = createCourseBody.partial();

export const reviewBody = z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().max(500).optional() });

export const idParam = z.object({ id: objectId });
