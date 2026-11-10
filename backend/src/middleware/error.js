import { ZodError } from 'zod';
import mongoose from 'mongoose';
import multer from 'multer';
import env from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// zod 4 wording is technical, so common issues get plain messages (custom messages from the schemas are kept).
const friendly = (issue) => {
  const field = issue.path.slice(-1)[0];
  const label = typeof field === 'string' ? field.replace(/([A-Z])/g, ' $1').toLowerCase() : 'value';
  if (issue.code === 'invalid_type') return issue.input === undefined ? 'This field is required' : `Enter a valid ${label}`;
  if (issue.code === 'too_small' && issue.origin === 'string') return issue.minimum === 1 ? 'This field is required' : `Must be at least ${issue.minimum} characters`;
  if (issue.code === 'too_big' && issue.origin === 'string') return `Must be at most ${issue.maximum} characters`;
  if (issue.code === 'too_small') return `Must be at least ${issue.minimum}`;
  if (issue.code === 'too_big') return `Must be at most ${issue.maximum}`;
  if (issue.code === 'invalid_format' && issue.format === 'email') return 'Enter a valid email address';
  if (issue.code === 'invalid_format' && issue.format === 'url') return 'Enter a valid link';
  if (issue.code === 'invalid_value') return 'Choose a valid option';
  return issue.message;
};

export const notFound = (req, _res, next) => next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err instanceof ZodError) {
    status = 400;
    message = 'Validation failed';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message.startsWith('Invalid input') || /^(Too (small|big)|Invalid )/.test(i.message) ? friendly(i) : i.message }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    message = `${field} already exists`;
  } else if (err instanceof multer.MulterError) {
    status = 400;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Session expired, please sign in again';
  }

  if (status >= 500) console.error(err);

  res.status(status).json({
    success: false,
    message: status >= 500 && env.isProd ? 'Internal server error' : message,
    ...(details ? { errors: details } : {}),
  });
};
