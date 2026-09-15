import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { getRedisConnection, disconnectRedis, checkRedisHealth } from './config/redis';
import { getEmailQueue, closeEmailQueue } from './queues/emailQueue';
import { startEmailWorker, stopEmailWorker } from './workers/emailWorker';
import authRoutes from './routes/authRoutes';
import emailRoutes from './routes/emailRoutes';
import { errorMiddleware } from './middleware/errorMiddleware';
import { logger } from './utils/logger';
import { prisma } from './config/database';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (env.FRONTEND_URL && origin === env.FRONTEND_URL) return callback(null, true);
    if (
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// Health handler
const handleHealth = async (_req: any, res: any) => {
  let dbStatus = 'error';
  let redisStatus = 'error';

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'ok';
  } catch {
    // DB connection failed
  }

  try {
    const redisOk = await checkRedisHealth();
    redisStatus = redisOk ? 'ok' : 'error';
  } catch {
    // Redis connection failed
  }

  const allOk = dbStatus === 'ok' && redisStatus === 'ok';

  res.status(allOk ? 200 : 503).json({
    success: allOk,
    data: {
      api: 'ok',
      database: dbStatus,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    },
  });
};

app.get('/api/health', handleHealth);
app.get('/health', handleHealth);

// API Routes — support /api, /, and /api/api paths
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/api/auth', authRoutes);

app.use('/api/emails', emailRoutes);
app.use('/emails', emailRoutes);
app.use('/api/api/emails', emailRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    errorCode: 'NOT_FOUND',
  });
});

// Error middleware (must be last)
app.use(errorMiddleware);

// Startup
async function startServer(): Promise<void> {
  logger.info('[STARTUP] Initializing ReachInbox Scheduler...');

  // 1. Connect database
  await connectDatabase();

  // 2. Connect Redis
  getRedisConnection();

  // 3. Initialize queue
  getEmailQueue();

  // 4. Start worker
  startEmailWorker();

  // 5. Start Express
  const server = app.listen(env.PORT, () => {
    logger.info(`[STARTUP] API server running on port ${env.PORT}`);
    logger.info(`[STARTUP] Environment: ${env.NODE_ENV}`);
    logger.info(`[STARTUP] Worker concurrency: ${env.WORKER_CONCURRENCY}`);
    logger.info(`[STARTUP] Max emails/hour: ${env.MAX_EMAILS_PER_HOUR}`);
    logger.info(`[STARTUP] Min email delay: ${env.MIN_EMAIL_DELAY_MS}ms`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`[SHUTDOWN] Received ${signal}, shutting down gracefully...`);

    // Stop accepting new requests
    server.close(() => {
      logger.info('[SHUTDOWN] HTTP server closed');
    });

    try {
      // Close worker first (stop processing)
      await stopEmailWorker();

      // Close queue
      await closeEmailQueue();

      // Disconnect Redis
      await disconnectRedis();

      // Disconnect database
      await disconnectDatabase();

      logger.info('[SHUTDOWN] All resources released. Exiting.');
      process.exit(0);
    } catch (error) {
      logger.error('[SHUTDOWN] Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Prevent unhandled rejections from crashing
  process.on('unhandledRejection', (reason) => {
    logger.error('[PROCESS] Unhandled rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('[PROCESS] Uncaught exception:', error);
    shutdown('uncaughtException');
  });
}

startServer().catch((error) => {
  logger.error('[STARTUP] Failed to start server:', error);
  process.exit(1);
});

export default app;
