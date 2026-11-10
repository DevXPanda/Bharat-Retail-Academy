import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';

// Links that run script or render markup when clicked or opened (javascript:, vbscript:, data:text/html ...).
const UNSAFE_LINK = /^(javascript|vbscript):|^data:(text\/html|application|image\/svg)/i;
const CONTROL_CHARS = /[\u0000- ]/g;
const isUnsafeLink = (text) => UNSAFE_LINK.test(text.replace(CONTROL_CHARS, ''));

// Drops Mongo operators ($ne, $gt ...) and dotted keys, and refuses script links, in anything the client sends.
const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      out[key] = clean(val);
    }
    return out;
  }
  if (typeof value === 'string' && isUnsafeLink(value)) throw ApiError.badRequest('That link is not allowed');
  return value;
};

export function sanitizeInput(req, _res, next) {
  try {
    if (req.body) req.body = clean(req.body);
    if (req.query) Object.defineProperty(req, 'query', { value: clean(req.query), writable: true, configurable: true });
    next();
  } catch (error) {
    next(error);
  }
}

const limiter = (windowMs, limit, message) => rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { success: false, message } });

export const apiLimiter = limiter(60 * 1000, 600, 'Too many requests, slow down and try again shortly');
export const publicFormLimiter = limiter(60 * 60 * 1000, 20, 'Too many submissions from this network, please try again later');
export const orderLimiter = limiter(60 * 60 * 1000, 30, 'Too many payment attempts, please try again later');
export const uploadLimiter = limiter(60 * 60 * 1000, 120, 'Upload limit reached, please try again later');
