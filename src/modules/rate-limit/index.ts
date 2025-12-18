/**
 * Rate Limiting Module
 *
 * Provides advanced rate limiting capabilities with multiple algorithms:
 * - Fixed Window: Simple, but can allow bursts at boundaries
 * - Sliding Window: More accurate, prevents boundary bursts
 * - Token Bucket: Allows controlled bursts while enforcing average rate
 *
 * Features:
 * - IP-based, user-based, or custom key rate limiting
 * - Whitelist/blacklist support
 * - Custom limits per endpoint or user role
 * - Memory or Redis storage
 * - Admin routes for management
 * - Standard rate limit headers
 *
 * @example
 * ```typescript
 * import { createRateLimiter, RateLimitService } from './modules/rate-limit';
 *
 * // Basic usage
 * app.use(createRateLimiter({
 *   max: 100,
 *   windowMs: 60 * 1000, // 1 minute
 *   algorithm: 'sliding-window'
 * }));
 *
 * // Pre-configured limiters
 * import { strictRateLimit, authRateLimit } from './modules/rate-limit';
 * app.post('/login', authRateLimit, loginHandler);
 * app.post('/sensitive', strictRateLimit, sensitiveHandler);
 * ```
 */

// Types
export * from './types.js';

// Service
export { RateLimitService } from './rate-limit.service.js';

// Middleware
export {
  createRateLimiter,
  rateLimitEndpoint,
  strictRateLimit,
  standardRateLimit,
  relaxedRateLimit,
  authRateLimit,
  ipRateLimit,
  userRateLimit,
  apiKeyRateLimit,
} from './rate-limit.middleware.js';

// Routes
export { createRateLimitRoutes } from './rate-limit.routes.js';

// Stores
export { MemoryStore } from './stores/memory.store.js';
export { RedisStore } from './stores/redis.store.js';
