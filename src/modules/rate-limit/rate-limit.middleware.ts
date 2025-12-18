import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { RateLimitConfig } from './types.js';
import { RateLimitService } from './rate-limit.service.js';

interface RequestWithUser extends Request {
  user?: {
    id?: string;
    role?: string;
  };
  rateLimiter?: RateLimitService;
}

/**
 * Create rate limiting middleware
 */
export function createRateLimiter(
  config: RateLimitConfig,
  service?: RateLimitService
): RequestHandler {
  const rateLimiter = service || new RateLimitService(config);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reqWithUser = req as RequestWithUser;

      // Generate key for this request
      const key = config.keyGenerator
        ? config.keyGenerator({
            ip: req.ip || 'unknown',
            method: req.method,
            url: req.url,
            path: req.path,
            userId: reqWithUser.user?.id,
            userRole: reqWithUser.user?.role,
            headers: req.headers as Record<string, string | string[] | undefined>,
          })
        : req.ip || 'unknown';

      // Check for custom limits based on endpoint or user role
      const customMax = config.max;
      const customWindowMs = config.windowMs;

      // Check rate limit
      const result = await rateLimiter.check(key, {
        max: customMax,
        windowMs: customWindowMs,
      });

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', result.limit.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

      if (!result.allowed) {
        if (result.retryAfter) {
          res.setHeader('Retry-After', result.retryAfter.toString());
        }

        // Default response
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          limit: result.limit,
          remaining: result.remaining,
          resetAt: new Date(result.resetAt).toISOString(),
          retryAfter: result.retryAfter,
        });
        return;
      }

      // Store rate limiter service on request for later use
      reqWithUser.rateLimiter = rateLimiter;

      next();
    } catch (error) {
      console.error('[RateLimitMiddleware] Error:', error);
      // On error, allow the request to proceed
      next();
    }
  };
}

/**
 * Create endpoint-specific rate limiter
 */
export function rateLimitEndpoint(
  max: number,
  windowMs: number,
  keyGenerator?: (req: Request) => string
): RequestHandler {
  const config: RateLimitConfig = {
    max,
    windowMs,
    keyGenerator: keyGenerator
      ? (reqData): string => keyGenerator(reqData as unknown as Request)
      : undefined,
  };

  return createRateLimiter(config);
}

/**
 * Pre-configured rate limiters for common use cases
 */

// Strict - for sensitive operations
export const strictRateLimit = rateLimitEndpoint(5, 60 * 1000); // 5 requests per minute

// Standard - for normal API endpoints
export const standardRateLimit = rateLimitEndpoint(100, 60 * 1000); // 100 requests per minute

// Relaxed - for public endpoints
export const relaxedRateLimit = rateLimitEndpoint(1000, 60 * 1000); // 1000 requests per minute

// Auth endpoints - for login/register
export const authRateLimit = rateLimitEndpoint(5, 15 * 60 * 1000); // 5 requests per 15 minutes

// By IP
export const ipRateLimit = (max: number, windowMs: number): RequestHandler =>
  rateLimitEndpoint(max, windowMs, (req) => req.ip || 'unknown');

// By User ID
export const userRateLimit = (max: number, windowMs: number): RequestHandler =>
  rateLimitEndpoint(max, windowMs, (req) => {
    const user = (req as RequestWithUser).user;
    return user?.id || req.ip || 'unknown';
  });

// By API Key
export const apiKeyRateLimit = (max: number, windowMs: number): RequestHandler =>
  rateLimitEndpoint(max, windowMs, (req) => {
    const apiKey = req.headers['x-api-key'] as string;
    return apiKey || req.ip || 'unknown';
  });
