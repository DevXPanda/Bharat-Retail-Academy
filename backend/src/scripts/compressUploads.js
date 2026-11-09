import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import { recompressStoredImages } from '../services/media.js';

connectDb()
  .then(recompressStoredImages)
  .then(async (r) => {
    console.log(`Checked ${r.checked} image(s), shrunk ${r.shrunk}, saved ${(r.savedBytes / 1048576).toFixed(2)} MB`);
    await disconnectDb();
    await mongoose.disconnect();
  })
  .catch(async (err) => {
    console.error(err.message);
    await disconnectDb();
    process.exit(1);
  });
