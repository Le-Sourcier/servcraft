/**
 * Security Middleware
 * Provides request-level security protections
 */
import type {
  FastifyRequest,
  FastifyReply,
  FastifyInstance,
  HookHandlerDoneFunction,
} from 'fastify';
import { randomBytes } from 'crypto';
import {
  sanitizeObject,
  containsDangerousContent,
  type SanitizeMiddlewareOptions,
} from './sanitize.js';
import { logger } from '../../core/logger.js';

// CSRF token storage (in production, use Redis)
const csrfTokens = new Map<string, { token: string; expires: number }>();
const CSRF_TOKEN_TTL = 3600000; // 1 hour

/**
 * Input Sanitization Middleware
 * Sanitizes request body, query, and params
 */
export function sanitizeInput(
  options: SanitizeMiddlewareOptions = {}
): (request: FastifyRequest, _reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const { skipFields = [], onlyFields = [] } = options;

    // Sanitize body
    if (request.body && typeof request.body === 'object') {
      const body = request.body as Record<string, unknown>;

      // Check for dangerous content and log warning
      const bodyStr = JSON.stringify(body);
      if (containsDangerousContent(bodyStr)) {
        logger.warn(
          {
            ip: request.ip,
            path: request.url,
            method: request.method,
          },
          'Potentially dangerous content detected in request body'
        );
      }

      // Apply field filters
      if (onlyFields.length > 0) {
        for (const field of onlyFields) {
          if (body[field] && typeof body[field] === 'string') {
            body[field] = sanitizeObject({ [field]: body[field] }, options)[field];
          }
        }
      } else {
        const filtered = { ...body };
        for (const field of skipFields) {
          delete filtered[field];
        }
        const sanitized = sanitizeObject(filtered, options);
        for (const field of skipFields) {
          sanitized[field] = body[field];
        }
        request.body = sanitized;
      }
    }

    // Sanitize query params
    if (request.query && typeof request.query === 'object') {
      request.query = sanitizeObject(request.query as Record<string, unknown>, options);
    }

    // Sanitize URL params
    if (request.params && typeof request.params === 'object') {
      request.params = sanitizeObject(request.params as Record<string, unknown>, options);
    }
  };
}

/**
 * CSRF Protection Middleware
 * Validates CSRF tokens for state-changing requests
 */
export function csrfProtection(): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return;
    }

    // Skip for API requests with valid JWT (they have their own protection)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return;
    }

    // Get CSRF token from header or body
    const tokenFromHeader = request.headers['x-csrf-token'] as string;
    const tokenFromBody = (request.body as Record<string, unknown>)?._csrf as string;
    const token = tokenFromHeader || tokenFromBody;

    // Get session ID (from cookie or header)
    const sessionId = (request.headers['x-session-id'] as string) || request.ip;

    if (!token) {
      logger.warn({ ip: request.ip, path: request.url }, 'CSRF token missing');
      return reply.status(403).send({
        success: false,
        message: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING',
      });
    }

    // Validate token
    const storedToken = csrfTokens.get(sessionId);
    if (!storedToken || storedToken.token !== token || storedToken.expires < Date.now()) {
      logger.warn({ ip: request.ip, path: request.url }, 'Invalid CSRF token');
      return reply.status(403).send({
        success: false,
        message: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      });
    }

    // Token is valid, generate a new one for next request (token rotation)
    const newToken = generateCsrfToken(sessionId);
    reply.header('X-CSRF-Token', newToken);
  };
}

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(sessionId: string): string {
  const token = randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, {
    token,
    expires: Date.now() + CSRF_TOKEN_TTL,
  });

  // Cleanup expired tokens periodically
  if (csrfTokens.size > 10000) {
    cleanupExpiredCsrfTokens();
  }

  return token;
}

/**
 * Cleanup expired CSRF tokens
 */
function cleanupExpiredCsrfTokens(): void {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires < now) {
      csrfTokens.delete(key);
    }
  }
}

/**
 * HTTP Parameter Pollution Protection
 * Ensures query parameters are not arrays when they shouldn't be
 */
export function hppProtection(
  allowedArrayParams: string[] = []
): (request: FastifyRequest, _reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (request.query && typeof request.query === 'object') {
      const query = request.query as Record<string, unknown>;

      for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value) && !allowedArrayParams.includes(key)) {
          // Take the last value (most common behavior)
          query[key] = value[value.length - 1];
        }
      }
    }
  };
}

/**
 * Security Headers Middleware
 * Adds additional security headers beyond Helmet
 */
export function securityHeaders(): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Prevent browsers from MIME-sniffing
    reply.header('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    reply.header('X-Frame-Options', 'DENY');

    // Enable XSS filter in browsers
    reply.header('X-XSS-Protection', '1; mode=block');

    // Control referrer information
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (formerly Feature-Policy)
    reply.header(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );

    // Prevent caching of sensitive data
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');
  };
}

/**
 * Request Size Limit Middleware
 * Additional protection against large payload attacks
 */
export function requestSizeLimit(
  maxSizeBytes: number = 10 * 1024 * 1024
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const contentLength = parseInt(request.headers['content-length'] || '0', 10);

    if (contentLength > maxSizeBytes) {
      logger.warn(
        {
          ip: request.ip,
          contentLength,
          maxSize: maxSizeBytes,
        },
        'Request payload too large'
      );

      return reply.status(413).send({
        success: false,
        message: 'Payload too large',
        code: 'PAYLOAD_TOO_LARGE',
      });
    }
  };
}

/**
 * Suspicious Activity Detection
 * Logs and optionally blocks suspicious patterns
 */
export function suspiciousActivityDetection(
  options: { blockSuspicious?: boolean } = {}
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  const { blockSuspicious = false } = options;

  // Suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//g, // Path traversal
    /<script/gi, // Script injection
    /union\s+select/gi, // SQL injection
    /\$\{.*\}/g, // Template injection
    /{{.*}}/g, // Template injection
    /\bexec\s*\(/gi, // Code execution
    /\beval\s*\(/gi, // Code execution
  ];

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const requestString = JSON.stringify({
      url: request.url,
      query: request.query,
      body: request.body,
      params: request.params,
    });

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestString)) {
        logger.warn(
          {
            ip: request.ip,
            path: request.url,
            method: request.method,
            pattern: pattern.source,
          },
          'Suspicious activity detected'
        );

        if (blockSuspicious) {
          return reply.status(400).send({
            success: false,
            message: 'Request blocked due to suspicious content',
            code: 'SUSPICIOUS_REQUEST',
          });
        }

        break;
      }
    }
  };
}

/**
 * Register all security middlewares
 */
export async function registerSecurityMiddlewares(
  app: FastifyInstance,
  options: {
    sanitize?: boolean | SanitizeMiddlewareOptions;
    csrf?: boolean;
    hpp?: boolean | string[];
    headers?: boolean;
    sizeLimit?: boolean | number;
    suspicionDetection?: boolean | { blockSuspicious: boolean };
  } = {}
): Promise<void> {
  const {
    sanitize = true,
    csrf = false, // Disabled by default for API-first apps
    hpp = true,
    headers = true,
    sizeLimit = true,
    suspicionDetection = true,
  } = options;

  // Security headers (run first)
  if (headers) {
    app.addHook(
      'onRequest',
      securityHeaders() as (
        request: FastifyRequest,
        reply: FastifyReply,
        done: HookHandlerDoneFunction
      ) => void
    );
  }

  // Request size limit
  if (sizeLimit) {
    const maxSize = typeof sizeLimit === 'number' ? sizeLimit : 10 * 1024 * 1024;
    app.addHook(
      'preHandler',
      requestSizeLimit(maxSize) as (
        request: FastifyRequest,
        reply: FastifyReply,
        done: HookHandlerDoneFunction
      ) => void
    );
  }

  // HPP protection
  if (hpp) {
    const allowedArrays = Array.isArray(hpp) ? hpp : [];
    app.addHook(
      'preHandler',
      hppProtection(allowedArrays) as (
        request: FastifyRequest,
        reply: FastifyReply,
        done: HookHandlerDoneFunction
      ) => void
    );
  }

  // Input sanitization
  if (sanitize) {
    const sanitizeOpts = typeof sanitize === 'object' ? sanitize : {};
    app.addHook(
      'preHandler',
      sanitizeInput(sanitizeOpts) as (
        request: FastifyRequest,
        reply: FastifyReply,
        done: HookHandlerDoneFunction
      ) => void
    );
  }

  // Suspicious activity detection
  if (suspicionDetection) {
    const detectionOpts = typeof suspicionDetection === 'object' ? suspicionDetection : {};
    app.addHook(
      'preHandler',
      suspiciousActivityDetection(detectionOpts) as (
        request: FastifyRequest,
        reply: FastifyReply,
        done: HookHandlerDoneFunction
      ) => void
    );
  }

  // CSRF protection (only for web apps, not APIs)
  if (csrf) {
    app.addHook(
      'preHandler',
      csrfProtection() as (
        request: FastifyRequest,
        reply: FastifyReply,
        done: HookHandlerDoneFunction
      ) => void
    );
  }

  logger.info('Security middlewares registered');
}
