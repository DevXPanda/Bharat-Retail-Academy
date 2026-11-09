import crypto from 'node:crypto';

export const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const randomId = (length = 8) => crypto.randomBytes(length).toString('hex').slice(0, length);

export const generatePassword = () => `${randomId(6)}${Math.floor(10 + Math.random() * 90)}!A`;
