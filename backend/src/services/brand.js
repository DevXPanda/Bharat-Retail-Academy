import fs from 'node:fs';
import { getSettings } from './settings.js';

// The logo lives in shared/src/logo so the websites and the PDFs/Excel files use the very same file.
const LOGO_DIR = new URL('../../../shared/src/logo/', import.meta.url);
const cache = new Map();

export function logoBuffer(file = 'logo-small.png') {
  if (!cache.has(file)) {
    try {
      cache.set(file, fs.readFileSync(new URL(file, LOGO_DIR)));
    } catch {
      cache.set(file, null);
    }
  }
  return cache.get(file);
}

// Name and contact line printed on documents; comes from Admin > Platform Settings.
export async function brandInfo() {
  const s = await getSettings();
  return {
    name: s.businessName || 'Bharat Retail Academy',
    gstin: s.gstin,
    address: s.address,
    email: s.supportEmail,
    phone: s.supportPhone,
    tagline: 'Learn | Apply | Grow | Sell Online',
    logo: logoBuffer('logo.png'),
    logoSmall: logoBuffer('logo-small.png'),
  };
}
