import type {
  RateLimitConfig,
  RateLimitStore,
  RateLimitResult,
  RateLimitInfo,
  RateLimitRequest,
} from './types.js';
import { MemoryStore } from './stores/memory.store.js';

/**
 * Rate Limiting Service
 * Supports multiple algorithms: fixed-window, sliding-window, token-bucket
 */
export class RateLimitService {
  private config: Required<RateLimitConfig>;
  private store: RateLimitStore;

  constructor(config: RateLimitConfig, store?: RateLimitStore) {
    const defaultStore = new MemoryStore();
    this.config = {
      max: config.max,
      windowMs: config.windowMs,
      algorithm: config.algorithm || 'sliding-window',
      whitelist: config.whitelist || [],
      blacklist: config.blacklist || [],
      keyGenerator: config.keyGenerator || ((req: RateLimitRequest): string => req.ip),
      skip: config.skip || ((): boolean => false),
      onLimitReached: config.onLimitReached || ((): void => {}),
      store: (config.store || defaultStore) as RateLimitStore,
      headers: config.headers !== false,
      message: config.message || 'Too many requests',
      statusCode: config.statusCode || 429,
      customLimits: config.customLimits || {},
    };

    this.store = (store || defaultStore) as RateLimitStore;
  }

  /**
   * Check if a request should be rate limited
   */
  async check(
    key: string,
    options?: { max?: number; windowMs?: number }
  ): Promise<RateLimitResult> {
    const max = options?.max || this.config.max;
    const windowMs = options?.windowMs || this.config.windowMs;

    // Check whitelist
    if (this.config.whitelist.includes(key)) {
      return {
        allowed: true,
        limit: max,
        remaining: max,
        resetAt: Date.now() + windowMs,
      };
    }

    // Check blacklist
    if (this.config.blacklist.includes(key)) {
      return {
        allowed: false,
        limit: max,
        remaining: 0,
        resetAt: Date.now() + windowMs,
      };
    }

    // Apply rate limiting algorithm
    switch (this.config.algorithm) {
      case 'fixed-window':
        return await this.fixedWindow(key, max, windowMs);
      case 'sliding-window':
        return await this.slidingWindow(key, max, windowMs);
      case 'token-bucket':
        return await this.tokenBucket(key, max, windowMs);
      default:
        return await this.slidingWindow(key, max, windowMs);
    }
  }

  /**
   * Fixed Window algorithm
   * Simple but can allow bursts at window boundaries
   */
  private async fixedWindow(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
    let entry = await this.store.get(key);
    const now = Date.now();

    // Create new window if none exists or if expired
    if (!entry || !entry.resetAt || entry.resetAt <= now) {
      entry = {
        count: 1,
        startTime: now,
        resetAt: now + windowMs,
        firstRequest: now,
        lastRequest: now,
      };
      await this.store.set(key, entry);

      return {
        allowed: true,
        limit: max,
        remaining: max - 1,
        resetAt: entry.resetAt ?? now + windowMs,
      };
    }

    // Increment count
    entry.count++;
    entry.lastRequest = now;
    await this.store.set(key, entry);

    const allowed = entry.count <= max;
    const resetAt = entry.resetAt ?? now + windowMs;

    return {
      allowed,
      limit: max,
      remaining: Math.max(0, max - entry.count),
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil((resetAt - now) / 1000),
    };
  }

  /**
   * Sliding Window algorithm
   * More accurate, prevents bursts at boundaries
   */
  private async slidingWindow(
    key: string,
    max: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    let entry = await this.store.get(key);
    const now = Date.now();

    if (!entry) {
      entry = {
        count: 1,
        startTime: now,
        resetAt: now + windowMs,
        firstRequest: now,
        lastRequest: now,
      };
      await this.store.set(key, entry);

      return {
        allowed: true,
        limit: max,
        remaining: max - 1,
        resetAt: entry.resetAt ?? now + windowMs,
      };
    }

    // Calculate sliding window
    const firstRequest = entry.firstRequest ?? entry.startTime;
    const timeInWindow = now - firstRequest;
    const windowProgress = timeInWindow / windowMs;

    // If we're past the window, reset
    if (windowProgress >= 1) {
      entry = {
        count: 1,
        startTime: now,
        resetAt: now + windowMs,
        firstRequest: now,
        lastRequest: now,
      };
      await this.store.set(key, entry);

      return {
        allowed: true,
        limit: max,
        remaining: max - 1,
        resetAt: entry.resetAt ?? now + windowMs,
      };
    }

    // Sliding window count
    const weightedCount = entry.count * (1 - windowProgress);
    const currentCount = Math.ceil(weightedCount) + 1;

    entry.count = currentCount;
    entry.lastRequest = now;
    await this.store.set(key, entry);

    const allowed = currentCount <= max;
    const resetAt = entry.resetAt ?? now + windowMs;

    return {
      allowed,
      limit: max,
      remaining: Math.max(0, max - currentCount),
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil((resetAt - now) / 1000),
    };
  }

  /**
   * Token Bucket algorithm
   * Allows small bursts but enforces average rate
   */
  private async tokenBucket(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
    let entry = await this.store.get(key);
    const now = Date.now();

    if (!entry) {
      entry = {
        count: max - 1, // Start with full bucket minus 1
        startTime: now,
        resetAt: now + windowMs,
        firstRequest: now,
        lastRequest: now,
      };
      await this.store.set(key, entry);

      return {
        allowed: true,
        limit: max,
        remaining: max - 1,
        resetAt: entry.resetAt ?? now + windowMs,
      };
    }

    // Refill tokens based on time passed
    const lastRequest = entry.lastRequest ?? entry.startTime;
    const timePassed = now - lastRequest;
    const refillRate = max / windowMs;
    const tokensToAdd = Math.floor(timePassed * refillRate);
    const tokens = Math.min(max, entry.count + tokensToAdd);

    // Try to consume a token
    if (tokens >= 1) {
      entry.count = tokens - 1;
      entry.lastRequest = now;
      entry.resetAt = now + windowMs;
      await this.store.set(key, entry);

      return {
        allowed: true,
        limit: max,
        remaining: entry.count,
        resetAt: entry.resetAt,
      };
    }

    // Not enough tokens
    const timeUntilToken = Math.ceil((1 - tokens) / refillRate / 1000);
    const resetAt = entry.resetAt ?? now + windowMs;

    return {
      allowed: false,
      limit: max,
      remaining: 0,
      resetAt,
      retryAfter: timeUntilToken,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(key: string): Promise<void> {
    await this.store.reset(key);
  }

  /**
   * Get current rate limit info for a key
   */
  async getInfo(key: string): Promise<RateLimitInfo | null> {
    const entry = await this.store.get(key);
    if (!entry) return null;

    const max = this.config.max;
    const remaining = Math.max(0, max - entry.count);

    return {
      limit: max,
      remaining,
      resetAt: entry.resetAt,
      count: entry.count,
      firstRequest: entry.firstRequest,
      lastRequest: entry.lastRequest,
    };
  }

  /**
   * Add IP to whitelist
   */
  addToWhitelist(ip: string): void {
    if (!this.config.whitelist.includes(ip)) {
      this.config.whitelist.push(ip);
    }
  }

  /**
   * Remove IP from whitelist
   */
  removeFromWhitelist(ip: string): void {
    const index = this.config.whitelist.indexOf(ip);
    if (index > -1) {
      this.config.whitelist.splice(index, 1);
    }
  }

  /**
   * Add IP to blacklist
   */
  addToBlacklist(ip: string): void {
    if (!this.config.blacklist.includes(ip)) {
      this.config.blacklist.push(ip);
    }
  }

  /**
   * Remove IP from blacklist
   */
  removeFromBlacklist(ip: string): void {
    const index = this.config.blacklist.indexOf(ip);
    if (index > -1) {
      this.config.blacklist.splice(index, 1);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Clear all rate limit data
   */
  async clear(): Promise<void> {
    await this.store.clear();
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<void> {
    if (this.store.cleanup) {
      await this.store.cleanup();
    }
  }
}
