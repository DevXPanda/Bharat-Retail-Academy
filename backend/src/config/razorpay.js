import Razorpay from 'razorpay';
import env from './env.js';
import { ApiError } from '../utils/ApiError.js';

let client = null;

export function getRazorpay() {
  if (!env.razorpayEnabled) throw new ApiError(503, 'Online payments are not configured yet. Please contact support.');
  if (!client) client = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return client;
}
