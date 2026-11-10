import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/ecomedu'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174,http://localhost:5175'),
  PUBLIC_API_URL: z.string().default('http://localhost:5000'),
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
  JITSI_DOMAIN: z.string().default('meet.jit.si'),
  JAAS_APP_ID: z.string().default(''),
  JAAS_KEY_ID: z.string().default(''),
  JAAS_PRIVATE_KEY: z.string().default(''),
  RESEND_API_KEY: z.string().default(''),
  RESEND_API_URL: z.string().default('https://api.resend.com/emails'),
  MAIL_FROM: z.string().default('Bharat Retail Academy <no-reply@bharatretailacademy.com>'),
  MAIL_REPLY_TO: z.string().default(''),
  MAIL_BLOCKED_DOMAINS: z.string().default('example.com,example.org,example.net,test.com,ecomedu.in'),
  KEEP_ALIVE_URL: z.string().default(''),
  KEEP_ALIVE_MINUTES: z.coerce.number().default(5),
  RENDER_EXTERNAL_URL: z.string().default(''),
  PUBLIC_SITE_URL: z.string().default(''),
  TEACHER_PORTAL_URL: z.string().default(''),
  ADMIN_PORTAL_URL: z.string().default(''),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

const env = parsed.data;
const origins = env.CLIENT_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
const trim = (value, fallback) => (value || fallback || '').replace(/\/+$/, '');

export default {
  ...env,
  isProd: env.NODE_ENV === 'production',
  clientOrigins: env.CLIENT_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  razorpayEnabled: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
  mailEnabled: Boolean(env.RESEND_API_KEY),
  mailBlockedDomains: env.MAIL_BLOCKED_DOMAINS.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean),
  keepAliveUrl: trim(env.KEEP_ALIVE_URL, env.RENDER_EXTERNAL_URL),
  siteUrl: trim(env.PUBLIC_SITE_URL, origins[0]),
  adminUrl: trim(env.ADMIN_PORTAL_URL, origins[1]),
  teacherUrl: trim(env.TEACHER_PORTAL_URL, origins[2]),
  jaasEnabled: Boolean(env.JAAS_APP_ID && env.JAAS_KEY_ID && env.JAAS_PRIVATE_KEY),
};
