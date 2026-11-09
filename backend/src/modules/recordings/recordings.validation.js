import { z } from 'zod';
import { RECORDING_STATUS } from '../../config/constants.js';
import { listQuerySchema } from '../../utils/query.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const listRecordingsQuery = listQuerySchema.extend({
  course: objectId.optional(),
  batch: objectId.optional(),
  teacher: objectId.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const createRecordingBody = z.object({
  title: z.string().trim().min(3).max(140),
  course: objectId,
  batch: objectId.optional().or(z.literal('').transform(() => undefined)),
  teacher: objectId.optional().or(z.literal('').transform(() => undefined)),
  liveClass: objectId.optional(),
  videoUrl: z.string().trim().min(1, 'Upload a video or paste a video link'),
  thumbnail: z.string().optional(),
  durationSec: z.coerce.number().min(0).default(0),
  classDate: z.coerce.date().optional(),
  status: z.enum(RECORDING_STATUS).default('published'),
});

export const updateRecordingBody = createRecordingBody.partial();
export const statusBody = z.object({ status: z.enum(RECORDING_STATUS) });
export const bulkBody = z.object({ ids: z.array(objectId).min(1), action: z.enum(['publish', 'unpublish', 'archive', 'delete']) });
export const idParam = z.object({ id: objectId });
