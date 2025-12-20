/**
 * Security Audit Service
 * Tracks and logs security-related events for compliance and monitoring
 */
import { randomUUID } from 'crypto';
import type { FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { logger } from '../../core/logger.js';
import { getRedis } from '../../database/redis.js';
import { prisma } from '../../database/prisma.js';

export type SecurityEventType =
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.logout'
  | 'auth.token.revoked'
  | 'auth.password.changed'
  | 'auth.password.reset.requested'
  | 'auth.password.reset.completed'
  | 'auth.mfa.enabled'
  | 'auth.mfa.disabled'
  | 'auth.mfa.verified'
  | 'auth.mfa.failed'
  | 'auth.session.created'
  | 'auth.session.destroyed'
  | 'access.denied'
  | 'access.granted'
  | 'rate.limit.exceeded'
  | 'suspicious.activity'
  | 'csrf.violation'
  | 'xss.attempt'
  | 'sqli.attempt'
  | 'brute.force.detected'
  | 'account.locked'
  | 'account.unlocked'
  | 'permission.changed'
  | 'role.changed'
  | 'api.key.created'
  | 'api.key.revoked'
  | 'data.export'
  | 'data.deletion'
  | 'admin.action';

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details?: Record<string, unknown>;
  success: boolean;
  timestamp: Date;
}

export interface SecurityEventInput {
  type: SecurityEventType;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  request?: FastifyRequest;
  resource?: string;
  action?: string;
  details?: Record<string, unknown>;
  success?: boolean;
}

// Default severity levels for event types
const DEFAULT_SEVERITY: Record<SecurityEventType, SecurityEvent['severity']> = {
  'auth.login.success': 'low',
  'auth.login.failed': 'medium',
  'auth.logout': 'low',
  'auth.token.revoked': 'low',
  'auth.password.changed': 'medium',
  'auth.password.reset.requested': 'medium',
  'auth.password.reset.completed': 'medium',
  'auth.mfa.enabled': 'medium',
  'auth.mfa.disabled': 'high',
  'auth.mfa.verified': 'low',
  'auth.mfa.failed': 'medium',
  'auth.session.created': 'low',
  'auth.session.destroyed': 'low',
  'access.denied': 'medium',
  'access.granted': 'low',
  'rate.limit.exceeded': 'medium',
  'suspicious.activity': 'high',
  'csrf.violation': 'high',
  'xss.attempt': 'critical',
  'sqli.attempt': 'critical',
  'brute.force.detected': 'high',
  'account.locked': 'high',
  'account.unlocked': 'medium',
  'permission.changed': 'high',
  'role.changed': 'high',
  'api.key.created': 'medium',
  'api.key.revoked': 'medium',
  'data.export': 'high',
  'data.deletion': 'critical',
  'admin.action': 'high',
};

export class SecurityAuditService {
  private redis = getRedis();
  private readonly REDIS_KEY_PREFIX = 'security:audit:';
  private readonly REDIS_ALERTS_KEY = 'security:alerts:recent';
  private readonly MAX_RECENT_ALERTS = 100;

  /**
   * Log a security event
   */
  async log(input: SecurityEventInput): Promise<SecurityEvent> {
    const event: SecurityEvent = {
      id: randomUUID(),
      type: input.type,
      severity: input.severity || DEFAULT_SEVERITY[input.type] || 'medium',
      userId: input.userId,
      ip: input.request?.ip,
      userAgent: input.request?.headers['user-agent'],
      resource: input.resource,
      action: input.action,
      details: input.details,
      success: input.success ?? true,
      timestamp: new Date(),
    };

    // Log to structured logger
    const logMethod = event.severity === 'critical' || event.severity === 'high' ? 'warn' : 'info';

    logger[logMethod](
      {
        securityEvent: true,
        eventId: event.id,
        eventType: event.type,
        severity: event.severity,
        userId: event.userId,
        ip: event.ip,
        success: event.success,
        ...event.details,
      },
      `Security: ${event.type}`
    );

    // Store in Redis for real-time monitoring (last 24 hours)
    try {
      const key = `${this.REDIS_KEY_PREFIX}${event.id}`;
      await this.redis.setex(key, 86400, JSON.stringify(event));

      // Add to recent alerts if high/critical severity
      if (event.severity === 'high' || event.severity === 'critical') {
        await this.redis.lpush(this.REDIS_ALERTS_KEY, JSON.stringify(event));
        await this.redis.ltrim(this.REDIS_ALERTS_KEY, 0, this.MAX_RECENT_ALERTS - 1);
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to store security event in Redis');
    }

    // Store in database for long-term retention
    try {
      await prisma.auditLog.create({
        data: {
          userId: event.userId,
          action: event.type,
          resource: event.resource || 'security',
          resourceId: event.id,
          ipAddress: event.ip,
          userAgent: event.userAgent,
          metadata: {
            severity: event.severity,
            success: event.success,
            details: event.details || null,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to store security event in database');
    }

    return event;
  }

  /**
   * Log authentication success
   */
  async logLoginSuccess(userId: string, request?: FastifyRequest): Promise<void> {
    await this.log({
      type: 'auth.login.success',
      userId,
      request,
      success: true,
    });
  }

  /**
   * Log authentication failure
   */
  async logLoginFailed(email: string, reason: string, request?: FastifyRequest): Promise<void> {
    await this.log({
      type: 'auth.login.failed',
      request,
      details: { email, reason },
      success: false,
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    description: string,
    request?: FastifyRequest,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      type: 'suspicious.activity',
      request,
      details: { description, ...details },
      success: false,
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimitExceeded(request: FastifyRequest, limit: number): Promise<void> {
    await this.log({
      type: 'rate.limit.exceeded',
      request,
      details: { limit, path: request.url },
      success: false,
    });
  }

  /**
   * Log brute force detection
   */
  async logBruteForceDetected(
    request: FastifyRequest,
    attempts: number,
    targetResource: string
  ): Promise<void> {
    await this.log({
      type: 'brute.force.detected',
      request,
      resource: targetResource,
      details: { attempts },
      success: false,
    });
  }

  /**
   * Log access denied
   */
  async logAccessDenied(
    userId: string | undefined,
    resource: string,
    action: string,
    request?: FastifyRequest
  ): Promise<void> {
    await this.log({
      type: 'access.denied',
      userId,
      request,
      resource,
      action,
      success: false,
    });
  }

  /**
   * Log admin action
   */
  async logAdminAction(
    adminUserId: string,
    action: string,
    targetResource: string,
    details?: Record<string, unknown>,
    request?: FastifyRequest
  ): Promise<void> {
    await this.log({
      type: 'admin.action',
      userId: adminUserId,
      request,
      resource: targetResource,
      action,
      details,
      success: true,
    });
  }

  /**
   * Get recent security alerts
   */
  async getRecentAlerts(limit = 50): Promise<SecurityEvent[]> {
    try {
      const alerts = await this.redis.lrange(this.REDIS_ALERTS_KEY, 0, limit - 1);
      return alerts.map((a) => JSON.parse(a) as SecurityEvent);
    } catch {
      return [];
    }
  }

  /**
   * Get security events for a user
   */
  async getUserEvents(userId: string, limit = 100): Promise<SecurityEvent[]> {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        action: {
          startsWith: 'auth.',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      type: log.action as SecurityEventType,
      severity:
        ((log.metadata as Record<string, unknown>)?.severity as SecurityEvent['severity']) || 'low',
      userId: log.userId || undefined,
      ip: log.ipAddress || undefined,
      userAgent: log.userAgent || undefined,
      resource: log.resource,
      action: log.action,
      details: (log.metadata as Record<string, unknown>)?.details as
        | Record<string, unknown>
        | undefined,
      success: ((log.metadata as Record<string, unknown>)?.success as boolean) ?? true,
      timestamp: log.createdAt,
    }));
  }

  /**
   * Get security stats
   */
  async getStats(hours = 24): Promise<{
    totalEvents: number;
    failedLogins: number;
    suspiciousActivities: number;
    rateLimitExceeded: number;
    criticalAlerts: number;
  }> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const [totalEvents, failedLogins, suspiciousActivities, rateLimitExceeded, criticalAlerts] =
      await Promise.all([
        prisma.auditLog.count({
          where: { createdAt: { gte: since } },
        }),
        prisma.auditLog.count({
          where: { action: 'auth.login.failed', createdAt: { gte: since } },
        }),
        prisma.auditLog.count({
          where: { action: 'suspicious.activity', createdAt: { gte: since } },
        }),
        prisma.auditLog.count({
          where: { action: 'rate.limit.exceeded', createdAt: { gte: since } },
        }),
        prisma.auditLog.count({
          where: {
            createdAt: { gte: since },
            metadata: { path: ['severity'], equals: 'critical' },
          },
        }),
      ]);

    return {
      totalEvents,
      failedLogins,
      suspiciousActivities,
      rateLimitExceeded,
      criticalAlerts,
    };
  }
}

let securityAuditService: SecurityAuditService | null = null;

export function getSecurityAuditService(): SecurityAuditService {
  if (!securityAuditService) {
    securityAuditService = new SecurityAuditService();
  }
  return securityAuditService;
}
