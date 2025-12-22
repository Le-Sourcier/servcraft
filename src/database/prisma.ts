import { PrismaClient } from '@prisma/client';
import { logger } from '../core/logger.js';
import { isProduction } from '../config/index.js';

declare global {
  var __prisma: PrismaClient | undefined;
}

const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log: isProduction() ? ['error'] : ['query', 'info', 'warn', 'error'],
    errorFormat: isProduction() ? 'minimal' : 'pretty',
  });
};

// Lazy initialization - only create client when accessed
let _prisma: PrismaClient | undefined;

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    // Initialize on first access
    if (!_prisma) {
      _prisma = globalThis.__prisma ?? prismaClientSingleton();
      if (!isProduction()) {
        globalThis.__prisma = _prisma;
      }
    }
    return (_prisma as any)[prop];
  },
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to database');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error({ err: error }, 'Error disconnecting from database');
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export { PrismaClient };
