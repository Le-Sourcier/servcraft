import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from '../config/index.js';
import { logger } from '../core/logger.js';

export interface SecurityOptions {
  helmet?: boolean;
  cors?: boolean;
  rateLimit?: boolean;
}

const defaultOptions: SecurityOptions = {
  helmet: true,
  cors: true,
  rateLimit: true,
};

export async function registerSecurity(
  app: FastifyInstance,
  options: SecurityOptions = {}
): Promise<void> {
  const opts = { ...defaultOptions, ...options };

  // Helmet - Security headers
  if (opts.helmet) {
    await app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    });
    logger.debug('Helmet security headers enabled');
  }

  // CORS
  if (opts.cors) {
    await app.register(cors, {
      origin: config.security.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
      maxAge: 86400, // 24 hours
    });
    logger.debug({ origin: config.security.corsOrigin }, 'CORS enabled');
  }

  // Rate Limiting
  if (opts.rateLimit) {
    await app.register(rateLimit, {
      max: config.security.rateLimit.max,
      timeWindow: config.security.rateLimit.windowMs,
      errorResponseBuilder: (_request, context) => ({
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter: context.after,
      }),
      keyGenerator: (request) => {
        // Use X-Forwarded-For if behind proxy, otherwise use IP
        return (
          request.headers['x-forwarded-for']?.toString().split(',')[0] || request.ip || 'unknown'
        );
      },
    });
    logger.debug(
      {
        max: config.security.rateLimit.max,
        windowMs: config.security.rateLimit.windowMs,
      },
      'Rate limiting enabled'
    );
  }
}

// Brute force protection for specific routes (login, etc.)
export async function registerBruteForceProtection(
  app: FastifyInstance,
  routePrefix: string,
  options: { max?: number; timeWindow?: number } = {}
): Promise<void> {
  const { max = 5, timeWindow = 300000 } = options; // 5 attempts per 5 minutes

  await app.register(rateLimit, {
    max,
    timeWindow,
    keyGenerator: (request) => {
      const ip =
        request.headers['x-forwarded-for']?.toString().split(',')[0] || request.ip || 'unknown';
      return `brute:${routePrefix}:${ip}`;
    },
    errorResponseBuilder: () => ({
      success: false,
      message: 'Too many attempts. Please try again later.',
    }),
    onExceeded: (request) => {
      logger.warn(
        {
          ip: request.ip,
          route: routePrefix,
        },
        'Brute force protection triggered'
      );
    },
  });
}
