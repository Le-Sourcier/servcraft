import { logger } from '../../core/logger.js';
import type { AuditLogEntry, AuditLogQuery } from './types.js';
import type { PaginatedResult } from '../../types/index.js';
import { AuditRepository, type AuditLogRecord } from './audit.repository.js';
import { prisma } from '../../database/prisma.js';

export class AuditService {
  private repository: AuditRepository;

  constructor() {
    this.repository = new AuditRepository(prisma);
  }

  async log(entry: AuditLogEntry): Promise<void> {
    await this.repository.create(entry);

    // Also log to structured logger for real-time monitoring
    logger.info(
      {
        audit: true,
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        ipAddress: entry.ipAddress,
      },
      `Audit: ${entry.action} on ${entry.resource}`
    );
  }

  async query(params: AuditLogQuery): Promise<PaginatedResult<AuditLogRecord>> {
    return this.repository.query(params);
  }

  async findByUser(userId: string, limit = 50): Promise<AuditLogRecord[]> {
    return this.repository.findByUser(userId, limit);
  }

  async findByResource(
    resource: string,
    resourceId: string,
    limit = 50
  ): Promise<AuditLogRecord[]> {
    return this.repository.findByResource(resource, resourceId, limit);
  }

  // Shortcut methods for common audit events
  async logCreate(
    resource: string,
    resourceId: string,
    userId?: string,
    newValue?: Record<string, unknown>,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      action: 'create',
      resource,
      resourceId,
      userId,
      newValue,
      ...meta,
    });
  }

  async logUpdate(
    resource: string,
    resourceId: string,
    userId?: string,
    oldValue?: Record<string, unknown>,
    newValue?: Record<string, unknown>,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      action: 'update',
      resource,
      resourceId,
      userId,
      oldValue,
      newValue,
      ...meta,
    });
  }

  async logDelete(
    resource: string,
    resourceId: string,
    userId?: string,
    oldValue?: Record<string, unknown>,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      action: 'delete',
      resource,
      resourceId,
      userId,
      oldValue,
      ...meta,
    });
  }

  async logLogin(userId: string, meta?: { ipAddress?: string; userAgent?: string }): Promise<void> {
    await this.log({
      action: 'login',
      resource: 'auth',
      userId,
      ...meta,
    });
  }

  async logLogout(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      action: 'logout',
      resource: 'auth',
      userId,
      ...meta,
    });
  }

  async logPasswordChange(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      action: 'password_change',
      resource: 'auth',
      userId,
      ...meta,
    });
  }

  // Data retention: delete old logs
  async cleanupOldLogs(retentionDays: number): Promise<number> {
    const count = await this.repository.deleteOlderThan(retentionDays);
    if (count > 0) {
      logger.info({ count, retentionDays }, 'Cleaned up old audit logs');
    }
    return count;
  }

  // Clear all logs (for testing)
  async clear(): Promise<void> {
    await this.repository.clear();
  }
}

let auditService: AuditService | null = null;

export function getAuditService(): AuditService {
  if (!auditService) {
    auditService = new AuditService();
  }
  return auditService;
}

export function createAuditService(): AuditService {
  return new AuditService();
}
