import { z } from 'zod';

const phone = z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, 'Enter a valid phone number');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone,
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  portal: z.enum(['admin', 'teacher', 'student']).optional(),
});

export const emailOnlySchema = z.object({ email: z.string().trim().email() });

export const verifyEmailSchema = z.object({ email: z.string().trim().email(), code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6 digit code') });

export const resetPasswordSchema = z.object({ token: z.string().min(32).max(200), password: z.string().min(8, 'Password must be at least 8 characters').max(72) });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

const teacherSelfSchema = z
  .object({
    designation: z.string().max(120),
    bio: z.string().max(1000),
    experienceYears: z.coerce.number().min(0).max(60),
    company: z.string().max(120),
    languages: z.array(z.string()),
    workExperience: z.string().max(1000),
    skills: z.array(z.string()),
    education: z.array(z.object({ title: z.string(), institute: z.string().optional(), year: z.string().optional() })),
    certifications: z.array(z.object({ title: z.string(), issuer: z.string().optional(), year: z.string().optional() })),
    bank: z
      .object({
        holderName: z.string(),
        bankName: z.string(),
        accountNumber: z.string(),
        ifsc: z.string(),
        accountType: z.string(),
        upiId: z.string(),
      })
      .partial(),
    availability: z.array(z.object({ day: z.string(), from: z.string(), to: z.string() })),
    social: z.object({ linkedin: z.string(), youtube: z.string(), instagram: z.string(), website: z.string() }).partial(),
  })
  .partial();

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone,
    avatar: z.string(),
    gender: z.enum(['Male', 'Female', 'Other', '']),
    dob: z.coerce.date(),
    location: z.string().max(120),
    about: z.string().max(1000),
    teacher: teacherSelfSchema,
  })
  .partial();
