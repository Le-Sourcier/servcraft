import type { RateLimitStore, RateLimitEntry } from '../types.js';

interface RedisClient {
  get: (key: string) => Promise<string | null>;
  setex: (key: string, ttl: number, value: string) => Promise<unknown>;
  del: (...keys: string[]) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
}

/**
 * Redis rate limit store
 * Recommended for multi-instance deployments
 */
export class RedisStore implements RateLimitStore {
  private client: RedisClient;
  private prefix: string;

  constructor(client: RedisClient, prefix = 'ratelimit:') {
    this.client = client;
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    try {
      const data = await this.client.get(this.getKey(key));
      if (!data) return null;

      const entry = JSON.parse(data) as RateLimitEntry;

      // Check if expired
      if (entry.resetAt && entry.resetAt < Date.now()) {
        await this.delete(key);
        return null;
      }

      return entry;
    } catch (error) {
      console.error('[RedisStore] Error getting entry:', error);
      return null;
    }
  }

  async set(key: string, entry: RateLimitEntry, ttlMs?: number): Promise<void> {
    try {
      const resetAt = entry.resetAt ?? Date.now() + (ttlMs ?? 60000);
      const ttl = Math.ceil((resetAt - Date.now()) / 1000);
      if (ttl <= 0) return;

      await this.client.setex(this.getKey(key), ttl, JSON.stringify(entry));
    } catch (error) {
      console.error('[RedisStore] Error setting entry:', error);
    }
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    try {
      const current = await this.get(key);
      const now = Date.now();

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

      current.count++;
      current.lastRequest = now;
      await this.set(key, current);

      return current;
    } catch (error) {
      console.error('[RedisStore] Error incrementing:', error);
      const now = Date.now();
      return {
        count: 0,
        startTime: now,
        resetAt: now + windowMs,
      };
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(this.getKey(key));
    } catch (error) {
      console.error('[RedisStore] Error deleting entry:', error);
    }
  }

  async reset(key: string): Promise<void> {
    await this.delete(key);
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error('[RedisStore] Error clearing:', error);
    }
  }

  async cleanup(): Promise<void> {
    // Redis handles TTL automatically, no cleanup needed
  }
}
