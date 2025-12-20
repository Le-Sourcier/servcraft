/**
 * Audit Repository
 * Prisma-based persistence for audit logs
 */
import type { Prisma } from '@prisma/client';
import type { PrismaClient, AuditLog as PrismaAuditLog } from '@prisma/client';
import type { AuditLogEntry, AuditLogQuery } from './types.js';
import type { PaginatedResult, PaginationParams } from '../../types/index.js';
import { createPaginatedResult, getSkip } from '../../utils/pagination.js';

export interface AuditLogRecord extends AuditLogEntry {
  id: string;
  createdAt: Date;
}

export class AuditRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new audit log entry
   */
  async create(entry: AuditLogEntry): Promise<AuditLogRecord> {
    const log = await this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        oldValue: entry.oldValue as Prisma.InputJsonValue,
        newValue: entry.newValue as Prisma.InputJsonValue,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        metadata: entry.metadata as Prisma.InputJsonValue,
      },
    });

    return this.mapFromPrisma(log);
  }

  /**
   * Create multiple audit log entries
   */
  async createMany(entries: AuditLogEntry[]): Promise<number> {
    const result = await this.prisma.auditLog.createMany({
      data: entries.map((entry) => ({
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        oldValue: entry.oldValue as Prisma.InputJsonValue,
        newValue: entry.newValue as Prisma.InputJsonValue,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        metadata: entry.metadata as Prisma.InputJsonValue,
      })),
    });

    return result.count;
  }

  /**
   * Find audit log by ID
   */
  async findById(id: string): Promise<AuditLogRecord | null> {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
    });

    return log ? this.mapFromPrisma(log) : null;
  }

  /**
   * Query audit logs with filters and pagination
   */
  async query(params: AuditLogQuery): Promise<PaginatedResult<AuditLogRecord>> {
    const { page = 1, limit = 20 } = params;
    const pagination: PaginationParams = { page, limit };

    const where: Prisma.AuditLogWhereInput = {};

    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = params.action;
    if (params.resource) where.resource = params.resource;
    if (params.resourceId) where.resourceId = params.resourceId;

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: getSkip(pagination),
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const data = logs.map((log) => this.mapFromPrisma(log));
    return createPaginatedResult(data, total, pagination);
  }

  /**
   * Find logs by user ID
   */
  async findByUser(userId: string, limit = 50): Promise<AuditLogRecord[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => this.mapFromPrisma(log));
  }

  /**
   * Find logs by resource
   */
  async findByResource(
    resource: string,
    resourceId?: string,
    limit = 50
  ): Promise<AuditLogRecord[]> {
    const where: Prisma.AuditLogWhereInput = { resource };
    if (resourceId) where.resourceId = resourceId;

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => this.mapFromPrisma(log));
  }

  /**
   * Find logs by action
   */
  async findByAction(action: string, limit = 50): Promise<AuditLogRecord[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => this.mapFromPrisma(log));
  }

  /**
   * Count logs with optional filters
   */
  async count(filters?: Partial<AuditLogQuery>): Promise<number> {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.resource) where.resource = filters.resource;

    return this.prisma.auditLog.count({ where });
  }

  /**
   * Delete old audit logs (for data retention)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }

  /**
   * Clear all audit logs (for testing)
   */
  async clear(): Promise<void> {
    await this.prisma.auditLog.deleteMany();
  }

  /**
   * Map Prisma model to domain type
   */
  private mapFromPrisma(log: PrismaAuditLog): AuditLogRecord {
    return {
      id: log.id,
      userId: log.userId ?? undefined,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId ?? undefined,
      oldValue: log.oldValue as Record<string, unknown> | undefined,
      newValue: log.newValue as Record<string, unknown> | undefined,
      ipAddress: log.ipAddress ?? undefined,
      userAgent: log.userAgent ?? undefined,
      metadata: log.metadata as Record<string, unknown> | undefined,
      createdAt: log.createdAt,
    };
  }
}
