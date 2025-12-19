/**
 * Redis Rate Limit Store
 * Supports distributed rate limiting across multiple instances
 *
 * Features:
 * - Atomic increment operations via Lua scripts
 * - Sliding window algorithm support
 * - Token bucket algorithm support
 * - Automatic TTL-based expiration
 */
import type { Redis } from 'ioredis';
import type { RateLimitStore, RateLimitEntry } from '../types.js';
import { getRedis } from '../../../database/redis.js';
import { logger } from '../../../core/logger.js';

const RATE_LIMIT_PREFIX = 'ratelimit:';

export class RedisStore implements RateLimitStore {
  private redis: Redis;
  private prefix: string;

  constructor(redis?: Redis, prefix = RATE_LIMIT_PREFIX) {
    this.redis = redis || getRedis();
    this.prefix = prefix;
  }

  private buildKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    try {
      const data = await this.redis.get(this.buildKey(key));
      if (!data) return null;

      const entry = JSON.parse(data) as RateLimitEntry;

      // Check if expired
      if (entry.resetAt && entry.resetAt < Date.now()) {
        await this.reset(key);
        return null;
      }

      return entry;
    } catch (error) {
      logger.error({ err: error, key }, 'Error getting rate limit entry');
      return null;
    }
  }

  async set(key: string, entry: RateLimitEntry, ttlMs?: number): Promise<void> {
    try {
      const fullKey = this.buildKey(key);
      const resetAt = entry.resetAt ?? Date.now() + (ttlMs ?? 60000);
      const ttlSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

      await this.redis.setex(fullKey, ttlSeconds, JSON.stringify(entry));
    } catch (error) {
      logger.error({ err: error, key }, 'Error setting rate limit entry');
    }
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const fullKey = this.buildKey(key);
    const now = Date.now();
    const ttlSeconds = Math.ceil(windowMs / 1000);

    try {
      // Use Lua script for atomic increment
      const script = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local windowMs = tonumber(ARGV[2])
        local ttl = tonumber(ARGV[3])

        local data = redis.call('GET', key)
        local entry

        if data then
          entry = cjson.decode(data)
          if now - entry.startTime >= windowMs then
            entry = {
              count = 1,
              startTime = now,
              firstRequest = now,
              lastRequest = now,
              resetAt = now + windowMs
            }
          else
            entry.count = entry.count + 1
            entry.lastRequest = now
          end
        else
          entry = {
            count = 1,
            startTime = now,
            firstRequest = now,
            lastRequest = now,
            resetAt = now + windowMs
          }
        end

        redis.call('SETEX', key, ttl, cjson.encode(entry))
        return cjson.encode(entry)
      `;

      const result = await this.redis.eval(
        script,
        1,
        fullKey,
        now.toString(),
        windowMs.toString(),
        ttlSeconds.toString()
      );

      return JSON.parse(result as string) as RateLimitEntry;
    } catch (error) {
      // Fallback to non-atomic increment
      logger.warn({ err: error, key }, 'Lua script failed, using fallback increment');
      return this.fallbackIncrement(key, windowMs);
    }
  }

  private async fallbackIncrement(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const current = await this.get(key);

    if (!current) {
      const entry: RateLimitEntry = {
        count: 1,
        startTime: now,
        resetAt: now + windowMs,
        firstRequest: now,
        lastRequest: now,
      };
      await this.set(key, entry, windowMs);
      return entry;
    }

    // Check if window expired
    if (now - current.startTime >= windowMs) {
      const entry: RateLimitEntry = {
        count: 1,
        startTime: now,
        resetAt: now + windowMs,
        firstRequest: now,
        lastRequest: now,
      };
      await this.set(key, entry, windowMs);
      return entry;
    }

    current.count++;
    current.lastRequest = now;
    await this.set(key, current);

    return current;
  }

  async reset(key: string): Promise<void> {
    try {
      await this.redis.del(this.buildKey(key));
    } catch (error) {
      logger.error({ err: error, key }, 'Error resetting rate limit entry');
    }
  }

  async clear(): Promise<void> {
    try {
      const pattern = `${this.prefix}*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error({ err: error }, 'Error clearing rate limit entries');
    }
  }

  async cleanup(): Promise<void> {
    // Redis handles TTL-based expiration automatically
  }

  /**
   * Sliding window increment using sorted sets
   * More accurate than fixed window, prevents burst at window edges
   */
  async slidingWindowIncrement(key: string, windowMs: number): Promise<RateLimitEntry> {
    const fullKey = `${this.prefix}sw:${key}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    const ttlSeconds = Math.ceil(windowMs / 1000) + 1;

    try {
      const script = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local windowStart = tonumber(ARGV[2])
        local ttl = tonumber(ARGV[3])

        redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
        redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))

        local count = redis.call('ZCARD', key)
        local first = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local firstTs = first[2] and tonumber(first[2]) or now

        redis.call('EXPIRE', key, ttl)

        return {count, firstTs, now}
      `;

      const result = (await this.redis.eval(
        script,
        1,
        fullKey,
        now.toString(),
        windowStart.toString(),
        ttlSeconds.toString()
      )) as [number, number, number];

      return {
        count: result[0],
        startTime: result[1],
        firstRequest: result[1],
        lastRequest: result[2],
        resetAt: result[1] + windowMs,
      };
    } catch (error) {
      logger.warn({ err: error, key }, 'Sliding window failed, using fallback');
      return this.increment(key, windowMs);
    }
  }

  /**
   * Token bucket implementation
   * Allows controlled bursts while maintaining average rate
   */
  async tokenBucketIncrement(
    key: string,
    maxTokens: number,
    refillRate: number,
    refillIntervalMs: number
  ): Promise<RateLimitEntry> {
    const fullKey = `${this.prefix}tb:${key}`;
    const now = Date.now();
    const ttlSeconds = 3600;

    try {
      const script = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local maxTokens = tonumber(ARGV[2])
        local refillRate = tonumber(ARGV[3])
        local refillIntervalMs = tonumber(ARGV[4])
        local ttl = tonumber(ARGV[5])

        local data = redis.call('GET', key)
        local entry

        if data then
          entry = cjson.decode(data)

          local timePassed = now - (entry.lastRefill or now)
          local tokensToAdd = math.floor(timePassed / refillIntervalMs) * refillRate

          entry.tokens = math.min(maxTokens, (entry.tokens or 0) + tokensToAdd)
          entry.lastRefill = now

          if entry.tokens > 0 then
            entry.tokens = entry.tokens - 1
            entry.count = (entry.count or 0) + 1
          end
        else
          entry = {
            count = 1,
            startTime = now,
            tokens = maxTokens - 1,
            lastRefill = now,
            firstRequest = now,
            lastRequest = now
          }
        end

        entry.lastRequest = now

        redis.call('SETEX', key, ttl, cjson.encode(entry))
        return cjson.encode(entry)
      `;

      const result = await this.redis.eval(
        script,
        1,
        fullKey,
        now.toString(),
        maxTokens.toString(),
        refillRate.toString(),
        refillIntervalMs.toString(),
        ttlSeconds.toString()
      );

      return JSON.parse(result as string) as RateLimitEntry;
    } catch (error) {
      logger.warn({ err: error, key }, 'Token bucket failed, using fallback');
      return this.increment(key, refillIntervalMs);
    }
  }

  /**
   * Get store statistics
   */
  async getStats(): Promise<{ keyCount: number }> {
    try {
      const pattern = `${this.prefix}*`;
      const keys = await this.redis.keys(pattern);
      return { keyCount: keys.length };
    } catch (error) {
      logger.error({ err: error }, 'Error getting rate limit stats');
      return { keyCount: 0 };
    }
  }
}
