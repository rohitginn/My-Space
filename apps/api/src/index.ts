import http from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { initSockets } from './sockets/index.js';
import { logger } from './utils/logger.js';

const app = createApp();
const server = http.createServer(app);

initSockets(server);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API server listening');
});
