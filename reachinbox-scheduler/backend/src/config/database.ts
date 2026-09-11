import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (e) => {
  logger.error('[DB] Prisma error:', e.message);
});

prisma.$on('warn', (e) => {
  logger.warn('[DB] Prisma warning:', e.message);
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('[DB] PostgreSQL connected successfully');
  } catch (error) {
    logger.error('[DB] Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('[DB] PostgreSQL disconnected');
}

export { prisma };
