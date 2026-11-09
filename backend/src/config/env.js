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
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

const env = parsed.data;

export default {
  ...env,
  isProd: env.NODE_ENV === 'production',
  clientOrigins: env.CLIENT_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  razorpayEnabled: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
  jaasEnabled: Boolean(env.JAAS_APP_ID && env.JAAS_KEY_ID && env.JAAS_PRIVATE_KEY),
};
