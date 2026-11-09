import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import User from '../models/User.js';

export const DEFAULT_ADMIN = { name: 'Bharat Retail Academy', email: 'admin@bharatretailacademy.com', phone: '9000000001', password: 'bharat@123' };

// Creates the admin if missing, otherwise resets its password and keeps it active.
export async function upsertAdmin({ name, email, phone, password } = DEFAULT_ADMIN) {
  const address = email.toLowerCase();
  const existing = await User.findOne({ email: address }).select('+password');
  if (existing) {
    existing.role = 'admin';
    existing.status = 'active';
    existing.password = password;
    await existing.save();
    return { created: false, email: address };
  }
  await User.create({ name, email: address, phone, password, role: 'admin', status: 'active' });
  return { created: true, email: address };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const [email, password, name] = process.argv.slice(2);
  connectDb()
    .then(() => upsertAdmin({ ...DEFAULT_ADMIN, ...(email ? { email } : {}), ...(password ? { password } : {}), ...(name ? { name } : {}) }))
    .then(async (result) => {
      console.log(result.created ? `Admin created: ${result.email}` : `Admin already existed, password reset: ${result.email}`);
      await disconnectDb();
      await mongoose.disconnect();
    })
    .catch(async (err) => {
      console.error(err.message);
      await disconnectDb();
      process.exit(1);
    });
}
