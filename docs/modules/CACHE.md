# Cache Module Documentation

## Overview

The Cache module provides a flexible caching layer with support for both in-memory and Redis-based caching. It offers a unified API for caching operations with TTL support, statistics tracking, and automatic cleanup.

## Features

- ✅ Dual provider support (Memory + Redis)
- ✅ Redis integration with ioredis
- ✅ TTL (Time To Live) support per key
- ✅ Automatic expiration and cleanup
- ✅ Cache statistics (hits/misses)
- ✅ Prefix support for key namespacing
- ✅ Batch operations (mget/mset)
- ✅ Counter operations (increment/decrement)
- ✅ Connection resilience with retry strategy
- ✅ Tag-based invalidation

## Configuration

### Memory Cache

```typescript
import { CacheService } from './modules/cache/cache.service.js';

const cache = new CacheService({
  provider: 'memory',
  ttl: 3600, // 1 hour default
  prefix: 'myapp:',
  memory: {
    maxSize: 1000, // Max 1000 items
    checkPeriod: 60, // Cleanup every 60 seconds
  },
});
```

### Redis Cache

```typescript
const cache = new CacheService({
  provider: 'redis',
  ttl: 3600,
  prefix: 'myapp:',
  redis: {
    host: 'localhost',
    port: 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0,
    connectTimeout: 10000,
    maxRetries: 10,
    tls: false,
  },
});
```

## API Reference

### Basic Operations

#### `set<T>(key: string, value: T, options?): Promise<void>`

Store a value in cache with optional TTL.

```typescript
await cache.set('user:123', { name: 'John', age: 30 });
await cache.set('session:abc', sessionData, { ttl: 1800 }); // 30 minutes
```

#### `get<T>(key: string): Promise<T | null>`

Retrieve a value from cache.

```typescript
const user = await cache.get<User>('user:123');
if (user) {
  console.log(user.name);
}
```

#### `delete(key: string): Promise<boolean>`

Delete a key from cache.

```typescript
const deleted = await cache.delete('user:123');
```

#### `exists(key: string): Promise<boolean>`

Check if a key exists.

```typescript
const exists = await cache.exists('user:123');
```

#### `clear(): Promise<void>`

Clear all keys with the configured prefix.

```typescript
await cache.clear();
```

### Advanced Operations

#### `getOrSet<T>(key, factory, options?): Promise<T>`

Get from cache or compute and store.

```typescript
const user = await cache.getOrSet(
  'user:123',
  async () => await db.users.findById(123),
  { ttl: 3600 }
);
```

#### `mget<T>(keys: string[]): Promise<(T | null)[]>`

Get multiple keys at once.

```typescript
const values = await cache.mget<string>(['key1', 'key2', 'key3']);
```

#### `mset<T>(entries): Promise<void>`

Set multiple keys at once.

```typescript
await cache.mset([
  { key: 'key1', value: 'val1', ttl: 60 },
  { key: 'key2', value: 'val2', ttl: 120 },
]);
```

#### `increment(key, delta?): Promise<number>`

Increment a counter.

```typescript
const views = await cache.increment('page:views');
const score = await cache.increment('user:score', 10);
```

#### `decrement(key, delta?): Promise<number>`

Decrement a counter.

```typescript
const remaining = await cache.decrement('rate:limit');
```

### Statistics

#### `getStats(): CacheStats`

Get cache statistics.

```typescript
const stats = cache.getStats();
console.log(`Hits: ${stats.hits}, Misses: ${stats.misses}`);
console.log(`Hit Rate: ${(stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)}%`);
```

### Connection Management

#### `close(): Promise<void>`

Close Redis connection (for Redis provider only).

```typescript
await cache.close();
```

## Migration from In-Memory

**Before (v0.1.0):**
```typescript
// Placeholder Redis - not actually connected
const cache = new CacheService({ provider: 'redis', ... });
// Redis methods were placeholders
```

**After (v0.2.0):**
```typescript
// Real Redis connection with ioredis
const cache = new CacheService({ provider: 'redis', ... });
// Fully functional Redis operations
```

## Usage Examples

### Session Caching

```typescript
// Store session
await cache.set(\`session:\${sessionId}\`, sessionData, { ttl: 1800 });

// Retrieve session
const session = await cache.get<Session>(\`session:\${sessionId}\`);

// Delete session (logout)
await cache.delete(\`session:\${sessionId}\`);
```

### API Response Caching

```typescript
async function getUsers() {
  return cache.getOrSet(
    'api:users',
    async () => await db.users.findAll(),
    { ttl: 300 } // 5 minutes
  );
}
```

### Rate Limiting

```typescript
const key = \`rate:\${userId}:\${endpoint}\`;
const count = await cache.increment(key);

if (count === 1) {
  await cache.set(key, count, { ttl: 60 }); // Reset after 1 minute
}

if (count > 100) {
  throw new Error('Rate limit exceeded');
}
```

### Page View Counter

```typescript
await cache.increment(\`page:\${pageId}:views\`);
const views = await cache.get<number>(\`page:\${pageId}:views\`) || 0;
```

## Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

## Production Checklist

- [x] Redis client connected with ioredis
- [x] Connection retry strategy implemented
- [x] Error handling for Redis operations
- [ ] Redis instance deployed (Docker/Cloud)
- [ ] Connection pooling configured
- [ ] Monitoring and alerts set up
- [ ] Cache invalidation strategy defined
- [ ] TTL values optimized for use case

## Performance Considerations

### Redis vs Memory

| Feature | Memory | Redis |
|---------|--------|-------|
| Speed | Very Fast | Fast |
| Persistence | No | Yes |
| Multi-instance | No | Yes |
| Max Size | RAM limited | Disk limited |
| TTL Cleanup | Manual | Automatic |

### Best Practices

1. **Use appropriate TTLs**: Short for frequently changing data
2. **Set maxSize for memory cache**: Prevent memory leaks
3. **Use prefixes**: Namespace keys per module
4. **Monitor hit rate**: Optimize caching strategy
5. **Handle cache misses**: Always have a fallback

## Troubleshooting

### Redis connection failed

**Problem**: Can't connect to Redis server.

**Solution**:
1. Check if Redis is running: `redis-cli ping`
2. Verify host/port in config
3. Check firewall rules
4. Verify password if set

### High memory usage

**Problem**: Memory cache consuming too much RAM.

**Solution**:
- Set `maxSize` in memory config
- Reduce TTL values
- Switch to Redis for large datasets

### Low hit rate

**Problem**: Cache not being used effectively.

**Solution**:
- Increase TTL values
- Verify keys are consistent
- Check if data is too dynamic for caching

## Testing

Run cache integration tests:
```bash
# Ensure Redis is running
docker run -d -p 6379:6379 redis:7-alpine

# Run tests
npm test tests/integration/cache-redis.test.ts
```

## Related Modules

- **Auth Module**: Session caching
- **Rate Limit Module**: Request counting
- **API Module**: Response caching

## Changelog

### v0.2.0 (2025-12-19)

**CACHE-001 Completed:**
- ✅ Connected real Redis with ioredis
- ✅ Removed placeholder implementation
- ✅ Added connection retry strategy
- ✅ Added error handling and logging
- ✅ Added comprehensive integration tests
- ✅ Added this documentation

### v0.1.0 (Initial)

- Placeholder Redis implementation
- Memory cache only functional
- No real Redis connection
