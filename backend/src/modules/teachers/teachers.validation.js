import { z } from 'zod';
import { CATEGORIES } from '../../config/constants.js';
import { listQuerySchema } from '../../utils/query.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const listTeachersQuery = listQuerySchema.extend({ expertise: z.string().optional() });

const permissions = z
  .object({
    scheduleClasses: z.boolean(),
    uploadRecordings: z.boolean(),
    messageStudents: z.boolean(),
    viewEarnings: z.boolean(),
  })
  .partial();

const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(''));
const rows = (fields) => z.array(z.object(fields)).max(15).optional();
const link = z
  .string()
  .trim()
  .max(300)
  .refine((v) => !v || /^https?:\/\//i.test(v), 'Enter a full link starting with https://')
  .optional()
  .or(z.literal(''));

const bank = z
  .object({
    holderName: optionalText(80),
    bankName: optionalText(80),
    accountNumber: z
      .string()
      .trim()
      .max(30)
      .refine((v) => !v || /^[0-9X*]{6,30}$/i.test(v), 'Account number must be digits only')
      .optional()
      .or(z.literal('')),
    ifsc: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => !v || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v), 'Enter a valid IFSC code (e.g. HDFC0001234)')
      .optional()
      .or(z.literal('')),
    accountType: z.enum(['Savings Account', 'Current Account']).optional(),
    upiId: optionalText(80),
    verified: z.boolean().optional(),
  })
  .partial();

export const createTeacherBody = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, 'Enter a valid phone number').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  avatar: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other', '']).optional(),
  dob: z.coerce.date().optional().or(z.literal('').transform(() => undefined)),
  location: optionalText(120),
  about: optionalText(1500),
  expertise: z.enum(CATEGORIES),
  bio: z.string().max(1000).optional(),
  designation: z.string().max(120).optional(),
  experienceYears: z.coerce.number().min(0).max(60).optional(),
  company: optionalText(120),
  languages: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  workExperience: optionalText(1500),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  education: rows({ title: z.string().trim().max(120), institute: z.string().trim().max(120).optional(), year: z.string().trim().max(10).optional() }),
  certifications: rows({ title: z.string().trim().max(120), issuer: z.string().trim().max(120).optional(), year: z.string().trim().max(10).optional() }),
  bank: bank.optional(),
  availability: rows({ day: z.string().trim().max(40), from: z.string().max(5), to: z.string().max(5) }),
  social: z.object({ linkedin: link, youtube: link, instagram: link, website: link }).partial().optional(),
  ratePerClass: z.coerce.number().min(0).optional(),
  courseIds: z.array(objectId).optional(),
  permissions: permissions.optional(),
  status: z.enum(['active', 'pending', 'inactive']).default('active'),
});

export const updateTeacherBody = createTeacherBody
  .omit({ password: true })
  .partial()
  .extend({ password: z.string().min(8).max(72).optional().or(z.literal('')) });

export const idParam = z.object({ id: objectId });
