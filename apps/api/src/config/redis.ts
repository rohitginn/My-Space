import { logger } from '../utils/logger.js';

export function getRedisStatus() {
  logger.debug('Redis service is available in docker-compose; client wiring is reserved for session/rate-limit storage.');
  return { enabled: false };
}
