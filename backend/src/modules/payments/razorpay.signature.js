import crypto from 'node:crypto';

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const hmac = (payload, secret) => crypto.createHmac('sha256', secret).update(payload).digest('hex');

export const verifyCheckoutSignature = ({ orderId, paymentId, signature, secret }) =>
  Boolean(secret) && safeEqual(hmac(`${orderId}|${paymentId}`, secret), signature);

export const verifyWebhookSignature = ({ rawBody, signature, secret }) => Boolean(secret) && safeEqual(hmac(rawBody, secret), signature);

export const signForTest = hmac;
