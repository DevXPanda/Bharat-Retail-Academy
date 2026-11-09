import http from 'node:http';
import env from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import app from './app.js';
import { initSockets } from './sockets/index.js';
import { startScheduler } from './jobs/scheduler.js';
import { resumePendingVideos } from './services/media.js';

async function main() {
  await connectDb();

  const server = http.createServer(app);
  initSockets(server);
  startScheduler();
  resumePendingVideos().then((n) => n && console.log(`Resuming compression of ${n} video(s)`)).catch((err) => console.error(err.message));

  server.listen(env.PORT, () => console.log(`API ready on http://localhost:${env.PORT}/api/v1`));

  const shutdown = async () => {
    server.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
