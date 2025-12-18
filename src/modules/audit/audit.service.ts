import { randomUUID } from 'crypto';
import { logger } from '../../core/logger.js';
import type { AuditLogEntry, AuditLogQuery } from './types.js';
import type { PaginatedResult } from '../../types/index.js';
import { createPaginatedResult } from '../../utils/pagination.js';

// In-memory storage (will be replaced by Prisma in production)
const auditLogs: Map<string, AuditLogEntry & { id: string; createdAt: Date }> = new Map();

export class AuditService {
  async log(entry: AuditLogEntry): Promise<void> {
    const id = randomUUID();
    const auditEntry = {
      ...entry,
      id,
      createdAt: new Date(),
    };

    auditLogs.set(id, auditEntry);

    // Also log to structured logger
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

  async query(
    params: AuditLogQuery
  ): Promise<PaginatedResult<AuditLogEntry & { id: string; createdAt: Date }>> {
    const { page = 1, limit = 20 } = params;
    let logs = Array.from(auditLogs.values());

    // Apply filters
    if (params.userId) {
      logs = logs.filter((log) => log.userId === params.userId);
    }
    if (params.action) {
      logs = logs.filter((log) => log.action === params.action);
    }
    if (params.resource) {
      logs = logs.filter((log) => log.resource === params.resource);
    }
    if (params.resourceId) {
      logs = logs.filter((log) => log.resourceId === params.resourceId);
    }
    if (params.startDate) {
      logs = logs.filter((log) => log.createdAt >= params.startDate!);
    }
    if (params.endDate) {
      logs = logs.filter((log) => log.createdAt <= params.endDate!);
    }

    // Sort by date descending
    logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = logs.length;
    const skip = (page - 1) * limit;
    const data = logs.slice(skip, skip + limit);

    return createPaginatedResult(data, total, { page, limit });
  }

  async findByUser(userId: string, limit = 50): Promise<(AuditLogEntry & { id: string; createdAt: Date })[]> {
    const result = await this.query({ userId, limit });
    return result.data;
  }

  async findByResource(
    resource: string,
    resourceId: string,
    limit = 50
  ): Promise<(AuditLogEntry & { id: string; createdAt: Date })[]> {
    const result = await this.query({ resource, resourceId, limit });
    return result.data;
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

  async logLogin(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
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

  // Clear all logs (for testing)
  async clear(): Promise<void> {
    auditLogs.clear();
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
