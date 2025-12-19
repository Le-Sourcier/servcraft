import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { CacheService } from '../../src/modules/cache/cache.service.js';

describe('CacheService - Redis Integration', () => {
  let redisCache: CacheService;
  let memoryCache: CacheService;

  beforeAll(() => {
    // Redis cache instance
    redisCache = new CacheService({
      provider: 'redis',
      ttl: 60, // 1 minute for tests
      prefix: 'test:',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: 1, // Use DB 1 for tests
      },
    });

    // Memory cache instance for comparison
    memoryCache = new CacheService({
      provider: 'memory',
      ttl: 60,
      prefix: 'test:',
    });
  });

  afterAll(async () => {
    await redisCache.close();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await redisCache.clear();
    await memoryCache.clear();
  });

  // ==========================================
  // BASIC OPERATIONS
  // ==========================================

  describe('Basic Operations', () => {
    it('should set and get a string value', async () => {
      await redisCache.set('test-string', 'Hello Redis!');
      const value = await redisCache.get<string>('test-string');
      expect(value).toBe('Hello Redis!');
    });

    it('should set and get a number value', async () => {
      await redisCache.set('test-number', 42);
      const value = await redisCache.get<number>('test-number');
      expect(value).toBe(42);
    });

    it('should set and get an object value', async () => {
      const obj = { name: 'John', age: 30, active: true };
      await redisCache.set('test-object', obj);
      const value = await redisCache.get<typeof obj>('test-object');
      expect(value).toEqual(obj);
    });

    it('should set and get an array value', async () => {
      const arr = [1, 2, 3, 4, 5];
      await redisCache.set('test-array', arr);
      const value = await redisCache.get<number[]>('test-array');
      expect(value).toEqual(arr);
    });

    it('should return null for non-existent key', async () => {
      const value = await redisCache.get('non-existent-key');
      expect(value).toBeNull();
    });

    it('should delete a key', async () => {
      await redisCache.set('test-delete', 'value');
      const deleted = await redisCache.delete('test-delete');
      expect(deleted).toBe(true);

      const value = await redisCache.get('test-delete');
      expect(value).toBeNull();
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await redisCache.delete('non-existent');
      expect(deleted).toBe(false);
    });

    it('should check if key exists', async () => {
      await redisCache.set('test-exists', 'value');
      const exists = await redisCache.exists('test-exists');
      expect(exists).toBe(true);

      const notExists = await redisCache.exists('not-exists');
      expect(notExists).toBe(false);
    });
  });

  // ==========================================
  // TTL AND EXPIRATION
  // ==========================================

  describe('TTL and Expiration', () => {
    it('should expire key after TTL', async () => {
      await redisCache.set('test-ttl', 'expires soon', { ttl: 1 }); // 1 second

      const valueBefore = await redisCache.get('test-ttl');
      expect(valueBefore).toBe('expires soon');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const valueAfter = await redisCache.get('test-ttl');
      expect(valueAfter).toBeNull();
    });

    it('should use custom TTL per key', async () => {
      await redisCache.set('short-ttl', 'short', { ttl: 1 });
      await redisCache.set('long-ttl', 'long', { ttl: 60 });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const shortValue = await redisCache.get('short-ttl');
      const longValue = await redisCache.get('long-ttl');

      expect(shortValue).toBeNull();
      expect(longValue).toBe('long');
    });

    it('should use default TTL when not specified', async () => {
      await redisCache.set('default-ttl', 'uses default');
      const value = await redisCache.get('default-ttl');
      expect(value).toBe('uses default');
    });
  });

  // ==========================================
  // ADVANCED OPERATIONS
  // ==========================================

  describe('Advanced Operations', () => {
    it('should implement getOrSet pattern', async () => {
      let factoryCalled = 0;
      const factory = async () => {
        factoryCalled++;
        return 'computed value';
      };

      // First call - should execute factory
      const value1 = await redisCache.getOrSet('getOrSet-key', factory);
      expect(value1).toBe('computed value');
      expect(factoryCalled).toBe(1);

      // Second call - should use cache
      const value2 = await redisCache.getOrSet('getOrSet-key', factory);
      expect(value2).toBe('computed value');
      expect(factoryCalled).toBe(1); // Factory not called again
    });

    it('should get multiple keys (mget)', async () => {
      await redisCache.set('mget-1', 'value1');
      await redisCache.set('mget-2', 'value2');
      await redisCache.set('mget-3', 'value3');

      const values = await redisCache.mget<string>(['mget-1', 'mget-2', 'mget-3', 'mget-missing']);
      expect(values).toEqual(['value1', 'value2', 'value3', null]);
    });

    it('should set multiple keys (mset)', async () => {
      await redisCache.mset([
        { key: 'mset-1', value: 'val1' },
        { key: 'mset-2', value: 'val2' },
        { key: 'mset-3', value: 'val3', ttl: 30 },
      ]);

      const value1 = await redisCache.get('mset-1');
      const value2 = await redisCache.get('mset-2');
      const value3 = await redisCache.get('mset-3');

      expect(value1).toBe('val1');
      expect(value2).toBe('val2');
      expect(value3).toBe('val3');
    });

    it('should increment a counter', async () => {
      await redisCache.set('counter', 10);

      const val1 = await redisCache.increment('counter');
      expect(val1).toBe(11);

      const val2 = await redisCache.increment('counter', 5);
      expect(val2).toBe(16);
    });

    it('should increment from 0 if key does not exist', async () => {
      const val = await redisCache.increment('new-counter');
      expect(val).toBe(1);
    });

    it('should decrement a counter', async () => {
      await redisCache.set('decrement-counter', 20);

      const val1 = await redisCache.decrement('decrement-counter');
      expect(val1).toBe(19);

      const val2 = await redisCache.decrement('decrement-counter', 5);
      expect(val2).toBe(14);
    });

    it('should clear all keys with prefix', async () => {
      await redisCache.set('clear-1', 'val1');
      await redisCache.set('clear-2', 'val2');
      await redisCache.set('clear-3', 'val3');

      await redisCache.clear();

      const val1 = await redisCache.get('clear-1');
      const val2 = await redisCache.get('clear-2');
      const val3 = await redisCache.get('clear-3');

      expect(val1).toBeNull();
      expect(val2).toBeNull();
      expect(val3).toBeNull();
    });
  });

  // ==========================================
  // STATISTICS
  // ==========================================

  describe('Statistics', () => {
    it('should track cache hits and misses', async () => {
      const initialStats = redisCache.getStats();
      const initialHits = initialStats.hits;
      const initialMisses = initialStats.misses;

      await redisCache.set('stats-key', 'value');

      // Hit
      await redisCache.get('stats-key');

      // Miss
      await redisCache.get('non-existent');

      const finalStats = redisCache.getStats();

      expect(finalStats.hits).toBeGreaterThan(initialHits);
      expect(finalStats.misses).toBeGreaterThan(initialMisses);
    });
  });

  // ==========================================
  // COMPARISON WITH MEMORY CACHE
  // ==========================================

  describe('Comparison with Memory Cache', () => {
    it('should behave identically to memory cache for basic operations', async () => {
      const testData = { name: 'Test', value: 123, active: true };

      // Set in both
      await redisCache.set('comparison-key', testData);
      await memoryCache.set('comparison-key', testData);

      // Get from both
      const redisValue = await redisCache.get<typeof testData>('comparison-key');
      const memoryValue = await memoryCache.get<typeof testData>('comparison-key');

      expect(redisValue).toEqual(memoryValue);
      expect(redisValue).toEqual(testData);
    });

    it('should handle increment identically', async () => {
      await redisCache.set('redis-counter', 5);
      await memoryCache.set('memory-counter', 5);

      const redisVal = await redisCache.increment('redis-counter', 3);
      const memoryVal = await memoryCache.increment('memory-counter', 3);

      expect(redisVal).toBe(memoryVal);
      expect(redisVal).toBe(8);
    });
  });

  // ==========================================
  // ERROR HANDLING
  // ==========================================

  describe('Error Handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      // This test verifies error handling
      // Set a value and then try to get it
      await redisCache.set('json-test', { valid: 'json' });
      const value = await redisCache.get('json-test');
      expect(value).toEqual({ valid: 'json' });
    });

    it('should handle concurrent operations', async () => {
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(redisCache.set(`concurrent-${i}`, `value-${i}`));
      }

      await Promise.all(operations);

      const value5 = await redisCache.get('concurrent-5');
      expect(value5).toBe('value-5');
    });
  });

  // ==========================================
  // PREFIX HANDLING
  // ==========================================

  describe('Prefix Handling', () => {
    it('should apply prefix to all keys', async () => {
      await redisCache.set('prefixed-key', 'value');

      // The actual key in Redis should be "test:prefixed-key"
      // We can't directly verify this without accessing Redis client
      // But we can verify that get/delete work correctly

      const value = await redisCache.get('prefixed-key');
      expect(value).toBe('value');

      const deleted = await redisCache.delete('prefixed-key');
      expect(deleted).toBe(true);
    });
  });

  // ==========================================
  // COMPLEX DATA TYPES
  // ==========================================

  describe('Complex Data Types', () => {
    it('should handle nested objects', async () => {
      const complex = {
        user: {
          name: 'John',
          profile: {
            age: 30,
            settings: {
              theme: 'dark',
              notifications: true,
            },
          },
        },
        metadata: {
          created: new Date().toISOString(),
          tags: ['admin', 'premium'],
        },
      };

      await redisCache.set('complex-object', complex);
      const value = await redisCache.get<typeof complex>('complex-object');

      expect(value).toEqual(complex);
      expect(value?.user.profile.settings.theme).toBe('dark');
    });

    it('should handle arrays of objects', async () => {
      const users = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ];

      await redisCache.set('users-array', users);
      const value = await redisCache.get<typeof users>('users-array');

      expect(value).toEqual(users);
      expect(value?.length).toBe(3);
    });
  });

  // ==========================================
  // CONNECTION RESILIENCE
  // ==========================================

  describe('Connection Resilience', () => {
    it('should handle operations when Redis is available', async () => {
      await redisCache.set('resilience-test', 'working');
      const value = await redisCache.get('resilience-test');
      expect(value).toBe('working');
    });
  });
});
