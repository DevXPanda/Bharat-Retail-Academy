import crypto from 'node:crypto';
import env from '../config/env.js';

// Non-image uploads (videos, documents, attachments) are only reachable through short-lived signed links.
const TTL_SECONDS = 12 * 60 * 60;
const FILE_URL = /(\/api\/v1\/files\/([a-f\d]{24})\/[^"\\?\s]*)(?![^"\\]*\?)/g;
const SIGNED_PARAMS = /(\/api\/v1\/files\/[a-f\d]{24}\/[^"\\?\s]*)\?exp=\d+&sig=[a-f\d]+/g;

const mac = (id, exp) => crypto.createHmac('sha256', env.JWT_SECRET).update(`file:${id}:${exp}`).digest('hex').slice(0, 40);

export function signedQuery(id) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  return `?exp=${exp}&sig=${mac(id, exp)}`;
}

export function verifyFileSignature(id, exp, sig) {
  const expiry = Number(exp);
  if (!expiry || expiry < Math.floor(Date.now() / 1000)) return false;
  const left = Buffer.from(mac(id, expiry));
  const right = Buffer.from(String(sig || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export const signFileUrls = (text) => text.replace(FILE_URL, (_match, path, id) => `${path}${signedQuery(id)}`);
export const stripFileSignatures = (text) => text.replace(SIGNED_PARAMS, '$1');

// Outgoing JSON: every file link gets a fresh signature (upload responses stay unsigned so the raw link is what gets stored).
export function signResponses(req, res, next) {
  const original = res.json.bind(res);
  res.json = (body) => {
    if (req.method === 'POST' && req.baseUrl.endsWith('/uploads')) return original(body);
    return res.type('application/json').send(signFileUrls(JSON.stringify(body)));
  };
  next();
}

// Incoming JSON: a signed link echoed back by the client is saved without its signature.
export function stripSignedLinks(req, _res, next) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) req.body = JSON.parse(stripFileSignatures(JSON.stringify(req.body)));
  next();
}

export const signPayload = (payload) => (payload === undefined ? payload : JSON.parse(signFileUrls(JSON.stringify(payload))));
