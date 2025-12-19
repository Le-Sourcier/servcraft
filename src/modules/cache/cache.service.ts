import { logger } from '../../core/logger.js';
import type { CacheConfig, CacheEntry, CacheOptions, CacheStats, RedisConfig } from './types.js';
import { Redis } from 'ioredis';

const defaultConfig: CacheConfig = {
  provider: 'memory',
  ttl: 3600, // 1 hour default
  prefix: 'servcraft:',
};

// In-memory cache storage
const memoryCache = new Map<string, CacheEntry>();
const stats: CacheStats = { hits: 0, misses: 0, keys: 0 };

export class CacheService {
  private config: CacheConfig;
  private redisClient: Redis | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...defaultConfig, ...config };

    if (this.config.provider === 'redis' && this.config.redis) {
      this.initRedis(this.config.redis);
    }

    // Start cleanup interval for memory cache
    if (this.config.provider === 'memory') {
      const checkPeriod = (this.config.memory?.checkPeriod || 60) * 1000;
      setInterval(() => this.cleanupExpired(), checkPeriod);
    }
  }

  private buildKey(key: string): string {
    return `${this.config.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);

    if (this.config.provider === 'redis' && this.redisClient) {
      return this.redisGet<T>(fullKey);
    }

    return this.memoryGet<T>(fullKey);
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const fullKey = this.buildKey(key);
    const ttl = options.ttl ?? this.config.ttl;

    if (this.config.provider === 'redis' && this.redisClient) {
      await this.redisSet(fullKey, value, ttl, options.tags);
    } else {
      this.memorySet(fullKey, value, ttl, options.tags);
    }
  }

  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);

    if (this.config.provider === 'redis' && this.redisClient) {
      return this.redisDelete(fullKey);
    }

    return this.memoryDelete(fullKey);
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);

    if (this.config.provider === 'redis' && this.redisClient) {
      return this.redisExists(fullKey);
    }

    return this.memoryExists(fullKey);
  }

  async clear(): Promise<void> {
    if (this.config.provider === 'redis' && this.redisClient) {
      await this.redisClear();
    } else {
      memoryCache.clear();
      stats.keys = 0;
    }

    logger.info('Cache cleared');
  }

  async invalidateByTag(tag: string): Promise<number> {
    let count = 0;

    if (this.config.provider === 'memory') {
      for (const [key, entry] of memoryCache.entries()) {
        if (entry.tags?.includes(tag)) {
          memoryCache.delete(key);
          count++;
        }
      }
      stats.keys = memoryCache.size;
    }

    logger.debug({ tag, count }, 'Cache invalidated by tag');
    return count;
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    for (const key of keys) {
      results.push(await this.get<T>(key));
    }
    return results;
  }

  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, { ttl: entry.ttl });
    }
  }

  async increment(key: string, delta = 1): Promise<number> {
    const fullKey = this.buildKey(key);

    if (this.config.provider === 'redis' && this.redisClient) {
      return this.redisIncrement(fullKey, delta);
    }

    const entry = memoryCache.get(fullKey);
    const current = typeof entry?.value === 'number' ? entry.value : 0;
    const newValue = current + delta;

    this.memorySet(
      fullKey,
      newValue,
      entry?.expiresAt ? (entry.expiresAt - Date.now()) / 1000 : this.config.ttl
    );
    return newValue;
  }

  async decrement(key: string, delta = 1): Promise<number> {
    return this.increment(key, -delta);
  }

  getStats(): CacheStats {
    return {
      ...stats,
      keys: this.config.provider === 'memory' ? memoryCache.size : stats.keys,
    };
  }

  // Memory cache methods
  private memoryGet<T>(key: string): T | null {
    const entry = memoryCache.get(key);

    if (!entry) {
      stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      stats.misses++;
      stats.keys = memoryCache.size;
      return null;
    }

    stats.hits++;
    return entry.value as T;
  }

  private memorySet<T>(key: string, value: T, ttl: number, tags?: string[]): void {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl * 1000,
      tags,
    };

    // Check max size
    const maxSize = this.config.memory?.maxSize;
    if (maxSize && memoryCache.size >= maxSize && !memoryCache.has(key)) {
      // Remove oldest entry
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) {
        memoryCache.delete(oldestKey);
      }
    }

    memoryCache.set(key, entry);
    stats.keys = memoryCache.size;
  }

  private memoryDelete(key: string): boolean {
    const deleted = memoryCache.delete(key);
    stats.keys = memoryCache.size;
    return deleted;
  }

  private memoryExists(key: string): boolean {
    const entry = memoryCache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return false;
    }
    return true;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of memoryCache.entries()) {
      if (now > entry.expiresAt) {
        memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      stats.keys = memoryCache.size;
      logger.debug({ cleaned }, 'Expired cache entries cleaned');
    }
  }

  // Redis methods
  private initRedis(config: RedisConfig): void {
    try {
      this.redisClient = new Redis({
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db || 0,
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

      this.redisClient.on('connect', () => {
        logger.info({ host: config.host, port: config.port }, 'Redis cache connected');
      });

      this.redisClient.on('error', (error: Error) => {
        logger.error({ err: error }, 'Redis cache error');
      });

      this.redisClient.on('close', () => {
        logger.warn('Redis cache connection closed');
      });

      this.redisClient.on('reconnecting', () => {
        logger.info('Redis cache reconnecting');
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize Redis cache');
      this.redisClient = null;
    }
  }

  private async redisGet<T>(key: string): Promise<T | null> {
    if (!this.redisClient) return null;
    try {
      const data = await this.redisClient.get(key);
      if (!data) {
        stats.misses++;
        return null;
      }
      stats.hits++;
      return JSON.parse(data) as T;
    } catch {
      stats.misses++;
      return null;
    }
  }

  private async redisSet<T>(key: string, value: T, ttl: number, _tags?: string[]): Promise<void> {
    if (!this.redisClient) return;
    await this.redisClient.setex(key, ttl, JSON.stringify(value));
  }

  private async redisDelete(key: string): Promise<boolean> {
    if (!this.redisClient) return false;
    const result = await this.redisClient.del(key);
    return result > 0;
  }

  private async redisExists(key: string): Promise<boolean> {
    if (!this.redisClient) return false;
    const result = await this.redisClient.exists(key);
    return result > 0;
  }

  private async redisClear(): Promise<void> {
    if (!this.redisClient) return;
    const pattern = `${this.config.prefix}*`;
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }

  private async redisIncrement(key: string, delta: number): Promise<number> {
    if (!this.redisClient) return 0;
    return this.redisClient.incrby(key, delta);
  }

  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }
  }
}

let cacheService: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheService) {
    cacheService = new CacheService();
  }
  return cacheService;
}

export function createCacheService(config: Partial<CacheConfig>): CacheService {
  cacheService = new CacheService(config);
  return cacheService;
}

// Cache decorator helper
export function cached<T extends (...args: unknown[]) => Promise<unknown>>(
  keyFn: (...args: Parameters<T>) => string,
  options: CacheOptions = {}
) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>) {
      const cache = getCacheService();
      const key = keyFn(...args);

      return cache.getOrSet(key, () => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}
