/**
 * Database availability check helpers for integration tests
 */
import { describe } from 'vitest';

let _dbAvailable: boolean | null = null;
let _redisAvailable: boolean | null = null;

/**
 * Check if PostgreSQL database is available
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  if (_dbAvailable !== null) return _dbAvailable;

  try {
    // Dynamic import to avoid initialization errors
    const { prisma } = await import('../../src/database/prisma.js');
    await prisma.$queryRaw`SELECT 1`;
    _dbAvailable = true;
  } catch {
    _dbAvailable = false;
  }

  return _dbAvailable;
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  if (_redisAvailable !== null) return _redisAvailable;

  try {
    const { getRedis } = await import('../../src/database/redis.js');
    const redis = getRedis();
    await redis.ping();
    _redisAvailable = true;
  } catch {
    _redisAvailable = false;
  }

  return _redisAvailable;
}

/**
 * Conditionally run describe block based on database availability
 * If database is not available, tests are skipped
 */
export function describeWithDb(
  name: string,
  fn: () => void
): ReturnType<typeof describe> | ReturnType<typeof describe.skip> {
  // We need to check synchronously for Vitest
  // Use environment variable to indicate DB availability
  const dbUrl = process.env.DATABASE_URL;
  const hasValidDbUrl = dbUrl && !dbUrl.includes('test:test@localhost');

  if (process.env.SKIP_DB_TESTS === 'true' || !hasValidDbUrl) {
    return describe.skip(name, fn);
  }

  return describe(name, fn);
}

/**
 * Conditionally run describe block based on Redis availability
 */
export function describeWithRedis(
  name: string,
  fn: () => void
): ReturnType<typeof describe> | ReturnType<typeof describe.skip> {
  const redisUrl = process.env.REDIS_URL;

  if (process.env.SKIP_REDIS_TESTS === 'true' || !redisUrl) {
    return describe.skip(name, fn);
  }

  return describe(name, fn);
}
