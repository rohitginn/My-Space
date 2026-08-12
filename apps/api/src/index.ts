import http from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { sql } from './config/db.js';
import { initSockets } from './sockets/index.js';
import { logger } from './utils/logger.js';

const app = createApp();
const server = http.createServer(app);

const io = initSockets(server);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API server listening');
});

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down API server');
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await sql.end({ timeout: 5 });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
