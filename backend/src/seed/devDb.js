import path from 'node:path';
import fs from 'node:fs';
import { MongoMemoryServer } from 'mongodb-memory-server';

const dbPath = path.resolve(process.cwd(), '../.mongo-data');
fs.mkdirSync(dbPath, { recursive: true });

const mongod = await MongoMemoryServer.create({ instance: { port: 27017, dbPath, storageEngine: 'wiredTiger' } });
console.log(`Local MongoDB running at ${mongod.getUri()} (data in ${dbPath})`);
console.log('Keep this process running, then run "npm run seed" and "npm run dev".');

const stop = async () => {
  await mongod.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
