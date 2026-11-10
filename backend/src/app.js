import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import env from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/error.js';
import { webhookHandler } from './modules/payments/payments.module.js';
import { apiLimiter, sanitizeInput } from './middleware/security.js';
import { signResponses, stripSignedLinks } from './services/fileLinks.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.clientOrigins, credentials: true }));
app.use(compression());
if (!env.isProd) app.use(morgan('dev'));

app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }), webhookHandler);

app.use(express.json({ limit: '1mb' }));
app.use('/api/v1', apiLimiter, sanitizeInput, stripSignedLinks, signResponses, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
