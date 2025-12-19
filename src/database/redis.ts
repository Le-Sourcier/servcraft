/**
 * Redis Client Module
 * Shared Redis connection for all services
 */
import { Redis } from 'ioredis';
import { logger } from '../core/logger.js';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
  connectTimeout?: number;
  maxRetries?: number;
  keyPrefix?: string;
}

let redisClient: Redis | null = null;

/**
 * Initialize the Redis connection
 */
export function initRedis(config: RedisConfig): Redis {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db || 0,
    keyPrefix: config.keyPrefix,
    connectTimeout: config.connectTimeout || 10000,
    retryStrategy: (times: number) => {
      const maxRetries = config.maxRetries || 10;
      if (times > maxRetries) {
        logger.error('Redis max retries reached, giving up');
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    ...(config.tls && { tls: {} }),
  });

  redisClient.on('connect', () => {
    logger.info({ host: config.host, port: config.port }, 'Redis connected');
  });

  redisClient.on('error', (error: Error) => {
    logger.error({ err: error }, 'Redis error');
  });

  redisClient.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redisClient.on('reconnecting', () => {
    logger.info('Redis reconnecting');
  });

  return redisClient;
}

/**
 * Get the Redis client instance
 * Creates a default connection if not initialized
 */
export function getRedis(): Redis {
  if (!redisClient) {
    // Initialize with default/env config
    const config: RedisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    };
    return initRedis(config);
  }
  return redisClient;
}

/**
 * Close the Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return redisClient?.status === 'ready';
}
