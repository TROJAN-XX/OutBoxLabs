/**
 * Standalone worker process entry point.
 * 
 * This can be run separately from the API server for horizontal scaling.
 * In the default setup, the worker runs embedded in the server process.
 * Use this when you need dedicated worker processes.
 * 
 * Usage: npx tsx src/worker.ts
 */
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { getRedisConnection, disconnectRedis } from './config/redis';
import { startEmailWorker, stopEmailWorker } from './workers/emailWorker';
import { closeEmailQueue } from './queues/emailQueue';
import { logger } from './utils/logger';

async function startWorkerProcess(): Promise<void> {
  logger.info('[WORKER-PROCESS] Starting standalone email worker...');

  await connectDatabase();
  getRedisConnection();
  startEmailWorker();

  logger.info(
    `[WORKER-PROCESS] Worker running with concurrency=${env.WORKER_CONCURRENCY}`
  );

  const shutdown = async (signal: string) => {
    logger.info(`[WORKER-PROCESS] Received ${signal}, shutting down...`);
    try {
      await stopEmailWorker();
      await closeEmailQueue();
      await disconnectRedis();
      await disconnectDatabase();
      logger.info('[WORKER-PROCESS] Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('[WORKER-PROCESS] Shutdown error:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startWorkerProcess().catch((error) => {
  logger.error('[WORKER-PROCESS] Failed to start:', error);
  process.exit(1);
});
