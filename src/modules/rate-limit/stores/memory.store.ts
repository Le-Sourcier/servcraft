import type { RateLimitStore, RateLimitEntry } from '../types.js';

/**
 * In-memory rate limit store
 * Good for single-instance deployments
 */
export class MemoryStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(cleanupIntervalMs = 60000) {
    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check if entry has expired
    const now = Date.now();
    if (entry.startTime && now - entry.startTime > this.getTtl(key)) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, entry: RateLimitEntry, _ttlMs: number): Promise<void> {
    this.store.set(key, entry);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now - entry.startTime >= windowMs) {
      // Start new window
      entry = {
        count: 1,
        startTime: now,
        timestamps: [now],
      };
    } else {
      // Increment existing window
      entry.count++;
      entry.timestamps = entry.timestamps || [];
      entry.timestamps.push(now);
    }

    this.store.set(key, entry);
    return entry;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Sliding window increment
   */
  async slidingWindowIncrement(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry) {
      entry = {
        count: 1,
        startTime: now,
        timestamps: [now],
      };
    } else {
      // Remove expired timestamps
      const windowStart = now - windowMs;
      entry.timestamps = (entry.timestamps || []).filter((t) => t > windowStart);
      entry.timestamps.push(now);
      entry.count = entry.timestamps.length;
      entry.startTime = entry.timestamps[0] || now;
    }

    this.store.set(key, entry);
    return entry;
  }

  /**
   * Token bucket increment
   */
  async tokenBucketIncrement(
    key: string,
    maxTokens: number,
    refillRate: number,
    refillIntervalMs: number
  ): Promise<RateLimitEntry> {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry) {
      entry = {
        count: 1,
        startTime: now,
        tokens: maxTokens - 1,
        lastRefill: now,
      };
    } else {
      // Calculate tokens to add based on time passed
      const timePassed = now - (entry.lastRefill || now);
      const tokensToAdd = Math.floor(timePassed / refillIntervalMs) * refillRate;

      entry.tokens = Math.min(maxTokens, (entry.tokens || 0) + tokensToAdd);
      entry.lastRefill = now;

      if (entry.tokens > 0) {
        entry.tokens--;
        entry.count++;
      }
    }

    this.store.set(key, entry);
    return entry;
  }

  /**
   * Get all keys (for admin purposes)
   */
  getKeys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Get store size
   */
  getSize(): number {
    return this.store.size;
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      // Default TTL of 1 hour for cleanup
      if (now - entry.startTime > 3600000) {
        this.store.delete(key);
      }
    }
  }

  private getTtl(_key: string): number {
    // Default TTL, can be customized per key if needed
    return 3600000; // 1 hour
  }
}
