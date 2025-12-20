# Rate Limit Module

Flexible rate limiting with multiple algorithms and storage backends.

## Features

- **Multiple Algorithms** - Fixed window, sliding window, token bucket
- **Multiple Stores** - Memory (default), Redis (distributed)
- **Whitelist/Blacklist** - IP-based access control
- **Custom Key Generation** - Rate limit by IP, user ID, API key, etc.
- **Standard Headers** - X-RateLimit-* headers support
- **Custom Limits** - Per-endpoint or per-user limits

## Algorithms

### Fixed Window

Simple counter that resets at fixed intervals. Can allow bursts at window boundaries.

```
Window 1          Window 2
[====|====]      [====|====]
  ^burst allowed here
```

### Sliding Window

Weighted count based on position within the window. Prevents boundary bursts.

```
    ◄─────── window ───────►
Past │ ████░░░░ │ ████████ │ Future
     │  30%     │   70%    │
     Weighted count = (old * 0.3) + new
```

### Token Bucket

Tokens refill over time, allowing small bursts but enforcing average rate.

```
Bucket (max 100 tokens)
┌──────────────────────────┐
│ ████████████░░░░░░░░░░░░ │  60 tokens available
└──────────────────────────┘
     Refill: 10 tokens/second
     Request consumes 1 token
```

## Usage

### Basic Setup

```typescript
import { RateLimitService } from 'servcraft/modules/rate-limit';
import { RedisStore } from 'servcraft/modules/rate-limit/stores/redis.store';

// Simple rate limiter (100 requests per minute)
const rateLimiter = new RateLimitService({
  max: 100,
  windowMs: 60 * 1000,
});

// Check if request is allowed
const result = await rateLimiter.check(clientIp);
if (!result.allowed) {
  // Return 429 Too Many Requests
}
```

### With Redis Store (Distributed)

```typescript
import { RedisStore } from 'servcraft/modules/rate-limit/stores/redis.store';

const redisStore = new RedisStore({
  prefix: 'ratelimit:api:',
});

const rateLimiter = new RateLimitService({
  max: 100,
  windowMs: 60 * 1000,
  algorithm: 'sliding-window',
}, redisStore);
```

### Algorithm Selection

```typescript
// Fixed window - simplest, good for non-critical APIs
const fixed = new RateLimitService({
  max: 100,
  windowMs: 60000,
  algorithm: 'fixed-window',
});

// Sliding window - recommended for most use cases
const sliding = new RateLimitService({
  max: 100,
  windowMs: 60000,
  algorithm: 'sliding-window',
});

// Token bucket - best for APIs that need to allow bursts
const tokenBucket = new RateLimitService({
  max: 100,
  windowMs: 60000,
  algorithm: 'token-bucket',
});
```

### Custom Key Generation

```typescript
// Rate limit by user ID
const userLimiter = new RateLimitService({
  max: 1000,
  windowMs: 60000,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Rate limit by API key
const apiLimiter = new RateLimitService({
  max: 5000,
  windowMs: 60000,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
});

// Rate limit by endpoint + IP
const endpointLimiter = new RateLimitService({
  max: 10,
  windowMs: 60000,
  keyGenerator: (req) => `${req.method}:${req.url}:${req.ip}`,
});
```

### Whitelist and Blacklist

```typescript
const limiter = new RateLimitService({
  max: 100,
  windowMs: 60000,
  whitelist: ['127.0.0.1', '10.0.0.1'], // Never rate limited
  blacklist: ['192.168.1.100'],          // Always blocked
});

// Dynamic whitelist/blacklist
limiter.addToWhitelist('10.0.0.2');
limiter.removeFromWhitelist('10.0.0.1');
limiter.addToBlacklist('suspicious-ip');
```

### Custom Limits per Endpoint

```typescript
// Different limits for different endpoints
const result = await limiter.check(clientIp, {
  max: 10,        // Override default max
  windowMs: 1000, // Override default window
});
```

### Getting Rate Limit Info

```typescript
const info = await limiter.getInfo(clientIp);
// {
//   limit: 100,
//   remaining: 45,
//   resetAt: 1703001234567,
//   count: 55,
//   firstRequest: 1703001200000,
//   lastRequest: 1703001230000
// }
```

### Reset Rate Limit

```typescript
// Reset for specific key
await limiter.reset(clientIp);

// Clear all rate limit data
await limiter.clear();

// Cleanup expired entries (memory store)
await limiter.cleanup();
```

## Configuration

```typescript
interface RateLimitConfig {
  max: number;              // Maximum requests per window
  windowMs: number;         // Window size in milliseconds
  algorithm?: Algorithm;    // 'fixed-window' | 'sliding-window' | 'token-bucket'
  whitelist?: string[];     // IPs that bypass rate limiting
  blacklist?: string[];     // IPs that are always blocked
  keyGenerator?: (req) => string;  // Custom key generation
  skip?: (req) => boolean;  // Skip rate limiting for some requests
  onLimitReached?: (req) => void;  // Callback when limit reached
  headers?: boolean;        // Include X-RateLimit headers (default: true)
  message?: string;         // Error message (default: 'Too many requests')
  statusCode?: number;      // HTTP status code (default: 429)
  customLimits?: Record<string, { max: number; windowMs: number }>;
}
```

## Response Types

```typescript
interface RateLimitResult {
  allowed: boolean;      // Whether request is allowed
  limit: number;         // Maximum requests per window
  remaining: number;     // Remaining requests in window
  resetAt: number;       // Timestamp when window resets
  retryAfter?: number;   // Seconds until retry (when blocked)
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt?: number;
  count: number;
  firstRequest?: number;
  lastRequest?: number;
}
```

## HTTP Headers

When `headers: true` (default), include these headers in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1703001234
Retry-After: 30  (only when blocked)
```

## Fastify Middleware Example

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';

const rateLimiter = new RateLimitService({
  max: 100,
  windowMs: 60000,
  algorithm: 'sliding-window',
});

async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const key = request.ip;
  const result = await rateLimiter.check(key);

  // Set headers
  reply.header('X-RateLimit-Limit', result.limit);
  reply.header('X-RateLimit-Remaining', result.remaining);
  reply.header('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

  if (!result.allowed) {
    reply.header('Retry-After', result.retryAfter);
    return reply.status(429).send({
      error: 'Too Many Requests',
      retryAfter: result.retryAfter,
    });
  }
}

// Register as preHandler
fastify.addHook('preHandler', rateLimitMiddleware);
```

## Pre-configured Limiters

```typescript
// Strict limiter for sensitive endpoints (login, password reset)
const strictLimiter = new RateLimitService({
  max: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  algorithm: 'sliding-window',
});

// Standard API limiter
const standardLimiter = new RateLimitService({
  max: 100,
  windowMs: 60 * 1000,
  algorithm: 'sliding-window',
});

// Relaxed limiter for read-only endpoints
const relaxedLimiter = new RateLimitService({
  max: 1000,
  windowMs: 60 * 1000,
  algorithm: 'token-bucket',
});

// Auth endpoints (very strict)
const authLimiter = new RateLimitService({
  max: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  algorithm: 'fixed-window',
});
```

## Redis Store

The Redis store enables distributed rate limiting across multiple server instances.

```typescript
import { RedisStore } from 'servcraft/modules/rate-limit/stores/redis.store';

const redisStore = new RedisStore({
  prefix: 'ratelimit:',  // Key prefix
});

// Uses atomic Lua scripts for accuracy
// Supports sliding-window and token-bucket with Redis
```

### Redis Key Structure

| Key Pattern | Purpose |
|-------------|---------|
| `ratelimit:{key}` | Fixed window counter |
| `ratelimit:sw:{key}` | Sliding window data |
| `ratelimit:tb:{key}` | Token bucket data |

## Best Practices

1. **Use sliding-window for APIs** - Prevents burst attacks at boundaries
2. **Use token-bucket for webhooks** - Allows legitimate burst traffic
3. **Use Redis for distributed systems** - Consistent limits across instances
4. **Different limits for different users** - Premium users get higher limits
5. **Log rate limit events** - Track abuse patterns
6. **Whitelist internal services** - Don't rate limit service-to-service calls
