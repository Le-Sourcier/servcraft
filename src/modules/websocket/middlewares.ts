import { logger } from '../../core/logger.js';
import type { SocketMiddleware, AuthenticatedSocket } from './types.js';

/**
 * Authentication Middleware
 * Validates JWT token from socket handshake
 */
export function authMiddleware(): SocketMiddleware {
  return (socket: unknown, next: (err?: Error) => void) => {
    const authSocket = socket as AuthenticatedSocket;

    try {
      // Get token from auth or query
      const token = authSocket.handshake.auth?.token || authSocket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      // Verify token (mock - in production use JWT library)
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // authSocket.userId = decoded.userId;
      // authSocket.user = decoded;

      // Mock authentication
      authSocket.userId = 'user_123';

      logger.debug({ socketId: authSocket.id, userId: authSocket.userId }, 'Socket authenticated');

      next();
    } catch (error) {
      logger.error({ error, socketId: authSocket.id }, 'Socket authentication failed');
      next(new Error('Authentication failed'));
    }
  };
}

/**
 * Rate Limiting Middleware
 * Limits socket connections per IP
 */
export function rateLimitMiddleware(maxConnections = 5, windowMs = 60000): SocketMiddleware {
  const connections = new Map<string, { count: number; resetAt: number }>();

  return (socket: unknown, next: (err?: Error) => void) => {
    const authSocket = socket as AuthenticatedSocket;
    const ip =
      authSocket.handshake.headers['x-forwarded-for'] ||
      authSocket.handshake.headers['x-real-ip'] ||
      'unknown';

    const now = Date.now();
    const key = ip as string;

    // Clean up expired entries
    for (const [k, v] of connections.entries()) {
      if (v.resetAt < now) {
        connections.delete(k);
      }
    }

    // Check rate limit
    const entry = connections.get(key);

    if (entry && entry.count >= maxConnections) {
      logger.warn({ ip, count: entry.count }, 'Socket rate limit exceeded');
      return next(new Error('Too many connections'));
    }

    // Update count
    if (entry) {
      entry.count++;
    } else {
      connections.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
    }

    // Cleanup on disconnect
    authSocket.on('disconnect', () => {
      const entry = connections.get(key);
      if (entry) {
        entry.count = Math.max(0, entry.count - 1);
      }
    });

    next();
  };
}

/**
 * CORS Middleware
 * Validates origin
 */
export function corsMiddleware(allowedOrigins: string[]): SocketMiddleware {
  return (socket: unknown, next: (err?: Error) => void) => {
    const authSocket = socket as AuthenticatedSocket;
    const origin = authSocket.handshake.headers.origin;

    if (!origin) {
      return next(new Error('Origin not specified'));
    }

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      next();
    } else {
      logger.warn({ origin, socketId: authSocket.id }, 'Origin not allowed');
      next(new Error('Origin not allowed'));
    }
  };
}

/**
 * Logging Middleware
 * Logs all socket events
 */
export function loggingMiddleware(): SocketMiddleware {
  return (socket: unknown, next: (err?: Error) => void) => {
    const authSocket = socket as AuthenticatedSocket;

    logger.info(
      {
        socketId: authSocket.id,
        userId: authSocket.userId,
        ip: authSocket.handshake.headers['x-forwarded-for'] || 'unknown',
        userAgent: authSocket.handshake.headers['user-agent'],
      },
      'Socket connecting'
    );

    // Log all events
    const originalEmit = authSocket.emit;
    authSocket.emit = function (event: string, ...args: unknown[]): boolean {
      logger.debug({ socketId: authSocket.id, event, argsCount: args.length }, 'Socket emit');
      return originalEmit.call(this, event, ...args);
    };

    next();
  };
}

/**
 * Validation Middleware
 * Validates socket handshake data
 */
export function validationMiddleware(requiredFields: string[]): SocketMiddleware {
  return (socket: unknown, next: (err?: Error) => void) => {
    const authSocket = socket as AuthenticatedSocket;
    const data = { ...authSocket.handshake.auth, ...authSocket.handshake.query };

    for (const field of requiredFields) {
      if (!data[field]) {
        logger.warn({ socketId: authSocket.id, field }, 'Required field missing');
        return next(new Error(`Required field missing: ${field}`));
      }
    }

    next();
  };
}

/**
 * Role-based Access Middleware
 * Restricts access based on user roles
 */
export function roleMiddleware(allowedRoles: string[]): SocketMiddleware {
  return (socket: unknown, next: (err?: Error) => void) => {
    const authSocket = socket as AuthenticatedSocket;

    if (!authSocket.user) {
      return next(new Error('User not authenticated'));
    }

    const userRoles = authSocket.user.roles || [];
    const hasRole = userRoles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      logger.warn(
        {
          socketId: authSocket.id,
          userId: authSocket.userId,
          requiredRoles: allowedRoles,
          userRoles,
        },
        'Insufficient permissions'
      );
      return next(new Error('Insufficient permissions'));
    }

    next();
  };
}

/**
 * Namespace Middleware
 * Validates namespace access
 */
export function namespaceMiddleware(
  validateAccess: (userId: string, namespace: string) => Promise<boolean>
): SocketMiddleware {
  return async (socket: unknown, next: (err?: Error) => void) => {
    const authSocket = socket as AuthenticatedSocket;
    const namespace = authSocket.handshake.query.namespace as string;

    if (!namespace) {
      return next(new Error('Namespace not specified'));
    }

    if (!authSocket.userId) {
      return next(new Error('User not authenticated'));
    }

    try {
      const hasAccess = await validateAccess(authSocket.userId, namespace);

      if (!hasAccess) {
        logger.warn(
          { socketId: authSocket.id, userId: authSocket.userId, namespace },
          'Namespace access denied'
        );
        return next(new Error('Access to namespace denied'));
      }

      next();
    } catch (error) {
      logger.error(
        { error, socketId: authSocket.id, namespace },
        'Error validating namespace access'
      );
      next(new Error('Failed to validate namespace access'));
    }
  };
}

/**
 * Throttling Middleware
 * Limits event emission rate
 */
export function throttleMiddleware(maxEvents = 100, windowMs = 1000): SocketMiddleware {
  const eventCounts = new Map<string, { count: number; resetAt: number }>();

  return (socket: unknown, next: (err?: Error) => void) => {
    const authSocket = socket as AuthenticatedSocket;

    // Wrap emit to count events
    const originalEmit = authSocket.emit;
    authSocket.emit = function (event: string, ...args: unknown[]): boolean {
      const now = Date.now();
      const key = authSocket.id;

      const entry = eventCounts.get(key);

      if (entry && entry.resetAt > now) {
        if (entry.count >= maxEvents) {
          logger.warn(
            { socketId: authSocket.id, event, count: entry.count },
            'Event throttle limit exceeded'
          );
          return false;
        }
        entry.count++;
      } else {
        eventCounts.set(key, {
          count: 1,
          resetAt: now + windowMs,
        });
      }

      return originalEmit.call(this, event, ...args);
    };

    // Cleanup on disconnect
    authSocket.on('disconnect', () => {
      eventCounts.delete(authSocket.id);
    });

    next();
  };
}

/**
 * Error Handling Middleware
 * Catches and logs errors
 */
export function errorMiddleware(): SocketMiddleware {
  return (socket: unknown, next: (err?: Error) => void) => {
    const authSocket = socket as AuthenticatedSocket;

    // Catch all errors
    authSocket.on('error', (...args: unknown[]) => {
      const error = args[0] instanceof Error ? args[0] : new Error(String(args[0]));
      logger.error({ error, socketId: authSocket.id, userId: authSocket.userId }, 'Socket error');
    });

    next();
  };
}
