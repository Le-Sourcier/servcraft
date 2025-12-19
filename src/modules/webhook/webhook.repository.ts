/**
 * Webhook Repository
 * Prisma-based persistence for webhook endpoints and deliveries
 */
import { Prisma } from '@prisma/client';
import type {
  WebhookEndpoint as PrismaEndpoint,
  WebhookDelivery as PrismaDelivery,
  WebhookDeliveryStatus as PrismaDeliveryStatus,
  PrismaClient,
} from '@prisma/client';
import { logger } from '../../core/logger.js';
import type {
  WebhookEndpoint,
  WebhookDelivery,
  WebhookDeliveryStatus,
  WebhookFilter,
  CreateWebhookEndpointData,
  UpdateWebhookEndpointData,
} from './types.js';
import { generateWebhookSecret } from './signature.js';

// Enum mappings
const statusToPrisma: Record<WebhookDeliveryStatus, PrismaDeliveryStatus> = {
  pending: 'PENDING',
  retrying: 'RETRYING',
  success: 'SUCCESS',
  failed: 'FAILED',
};

const statusFromPrisma: Record<PrismaDeliveryStatus, WebhookDeliveryStatus> = {
  PENDING: 'pending',
  RETRYING: 'retrying',
  SUCCESS: 'success',
  FAILED: 'failed',
};

export class WebhookRepository {
  constructor(private prisma: PrismaClient) {}

  // ==========================================
  // ENDPOINT METHODS
  // ==========================================

  async createEndpoint(data: CreateWebhookEndpointData): Promise<WebhookEndpoint> {
    const endpoint = await this.prisma.webhookEndpoint.create({
      data: {
        url: data.url,
        secret: generateWebhookSecret(),
        events: data.events,
        enabled: true,
        description: data.description,
        headers: data.headers as Prisma.InputJsonValue,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
    });

    return this.mapEndpointFromPrisma(endpoint);
  }

  async getEndpointById(id: string): Promise<WebhookEndpoint | null> {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({
      where: { id },
    });

    return endpoint ? this.mapEndpointFromPrisma(endpoint) : null;
  }

  async listEndpoints(enabledOnly = false): Promise<WebhookEndpoint[]> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: enabledOnly ? { enabled: true } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return endpoints.map((e) => this.mapEndpointFromPrisma(e));
  }

  async getEndpointsByEvent(eventType: string): Promise<WebhookEndpoint[]> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        enabled: true,
        OR: [{ events: { has: eventType } }, { events: { has: '*' } }],
      },
    });

    return endpoints.map((e) => this.mapEndpointFromPrisma(e));
  }

  async updateEndpoint(
    id: string,
    data: UpdateWebhookEndpointData
  ): Promise<WebhookEndpoint | null> {
    try {
      const updateData: Prisma.WebhookEndpointUpdateInput = {};

      if (data.url !== undefined) updateData.url = data.url;
      if (data.events !== undefined) updateData.events = data.events;
      if (data.enabled !== undefined) updateData.enabled = data.enabled;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.headers !== undefined) updateData.headers = data.headers as Prisma.InputJsonValue;
      if (data.metadata !== undefined) updateData.metadata = data.metadata as Prisma.InputJsonValue;

      const endpoint = await this.prisma.webhookEndpoint.update({
        where: { id },
        data: updateData,
      });

      return this.mapEndpointFromPrisma(endpoint);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  async rotateSecret(id: string): Promise<WebhookEndpoint | null> {
    try {
      const endpoint = await this.prisma.webhookEndpoint.update({
        where: { id },
        data: { secret: generateWebhookSecret() },
      });

      return this.mapEndpointFromPrisma(endpoint);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  async deleteEndpoint(id: string): Promise<boolean> {
    try {
      await this.prisma.webhookEndpoint.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  // ==========================================
  // DELIVERY METHODS
  // ==========================================

  async createDelivery(data: {
    endpointId: string;
    eventType: string;
    payload: Record<string, unknown>;
    maxAttempts?: number;
  }): Promise<WebhookDelivery> {
    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        endpointId: data.endpointId,
        eventType: data.eventType,
        status: 'PENDING',
        payload: data.payload as Prisma.InputJsonValue,
        attempts: 0,
        maxAttempts: data.maxAttempts || 5,
      },
    });

    return this.mapDeliveryFromPrisma(delivery);
  }

  async getDeliveryById(id: string): Promise<WebhookDelivery | null> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id },
    });

    return delivery ? this.mapDeliveryFromPrisma(delivery) : null;
  }

  async listDeliveries(filter?: WebhookFilter): Promise<WebhookDelivery[]> {
    const where: Prisma.WebhookDeliveryWhereInput = {};

    if (filter?.endpointId) where.endpointId = filter.endpointId;
    if (filter?.eventType) where.eventType = filter.eventType;
    if (filter?.status) where.status = statusToPrisma[filter.status];
    if (filter?.startDate) where.createdAt = { gte: filter.startDate };
    if (filter?.endDate) {
      where.createdAt = { ...((where.createdAt as object) || {}), lte: filter.endDate };
    }

    const deliveries = await this.prisma.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter?.limit || 100,
      skip: filter?.offset || 0,
    });

    return deliveries.map((d) => this.mapDeliveryFromPrisma(d));
  }

  async getRetriableDeliveries(): Promise<WebhookDelivery[]> {
    const now = new Date();

    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        OR: [{ status: 'PENDING' }, { status: 'RETRYING' }],
        nextRetryAt: { lte: now },
      },
      orderBy: { nextRetryAt: 'asc' },
    });

    return deliveries.map((d) => this.mapDeliveryFromPrisma(d));
  }

  async updateDelivery(
    id: string,
    data: Partial<{
      status: WebhookDeliveryStatus;
      attempts: number;
      responseStatus: number;
      responseBody: string;
      error: string;
      nextRetryAt: Date;
      deliveredAt: Date;
    }>
  ): Promise<WebhookDelivery | null> {
    try {
      const updateData: Prisma.WebhookDeliveryUpdateInput = {};

      if (data.status !== undefined) updateData.status = statusToPrisma[data.status];
      if (data.attempts !== undefined) updateData.attempts = data.attempts;
      if (data.responseStatus !== undefined) updateData.responseStatus = data.responseStatus;
      if (data.responseBody !== undefined) updateData.responseBody = data.responseBody;
      if (data.error !== undefined) updateData.error = data.error;
      if (data.nextRetryAt !== undefined) updateData.nextRetryAt = data.nextRetryAt;
      if (data.deliveredAt !== undefined) updateData.deliveredAt = data.deliveredAt;

      const delivery = await this.prisma.webhookDelivery.update({
        where: { id },
        data: updateData,
      });

      return this.mapDeliveryFromPrisma(delivery);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  async incrementAttempts(id: string): Promise<WebhookDelivery | null> {
    try {
      const delivery = await this.prisma.webhookDelivery.update({
        where: { id },
        data: { attempts: { increment: 1 } },
      });

      return this.mapDeliveryFromPrisma(delivery);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  async deleteDelivery(id: string): Promise<boolean> {
    try {
      await this.prisma.webhookDelivery.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  async cleanupOldDeliveries(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.webhookDelivery.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        OR: [{ status: 'SUCCESS' }, { status: 'FAILED' }],
      },
    });

    logger.info({ count: result.count, olderThanDays }, 'Cleaned up old webhook deliveries');
    return result.count;
  }

  // ==========================================
  // STATS METHODS
  // ==========================================

  async getStats(endpointId?: string): Promise<{
    totalDeliveries: number;
    successCount: number;
    failedCount: number;
    pendingCount: number;
  }> {
    const where: Prisma.WebhookDeliveryWhereInput = endpointId ? { endpointId } : {};

    const [total, success, failed, pending] = await Promise.all([
      this.prisma.webhookDelivery.count({ where }),
      this.prisma.webhookDelivery.count({ where: { ...where, status: 'SUCCESS' } }),
      this.prisma.webhookDelivery.count({ where: { ...where, status: 'FAILED' } }),
      this.prisma.webhookDelivery.count({
        where: { ...where, OR: [{ status: 'PENDING' }, { status: 'RETRYING' }] },
      }),
    ]);

    return {
      totalDeliveries: total,
      successCount: success,
      failedCount: failed,
      pendingCount: pending,
    };
  }

  // ==========================================
  // MAPPING HELPERS
  // ==========================================

  private mapEndpointFromPrisma(prismaEndpoint: PrismaEndpoint): WebhookEndpoint {
    return {
      id: prismaEndpoint.id,
      url: prismaEndpoint.url,
      secret: prismaEndpoint.secret,
      events: prismaEndpoint.events,
      enabled: prismaEndpoint.enabled,
      description: prismaEndpoint.description || undefined,
      headers: (prismaEndpoint.headers as Record<string, string>) || undefined,
      metadata: (prismaEndpoint.metadata as Record<string, unknown>) || undefined,
      createdAt: prismaEndpoint.createdAt,
      updatedAt: prismaEndpoint.updatedAt,
    };
  }

  private mapDeliveryFromPrisma(prismaDelivery: PrismaDelivery): WebhookDelivery {
    return {
      id: prismaDelivery.id,
      endpointId: prismaDelivery.endpointId,
      eventId: prismaDelivery.id, // Use delivery ID as event ID for now
      eventType: prismaDelivery.eventType,
      status: statusFromPrisma[prismaDelivery.status],
      attempts: prismaDelivery.attempts,
      maxAttempts: prismaDelivery.maxAttempts,
      nextRetryAt: prismaDelivery.nextRetryAt || undefined,
      responseStatus: prismaDelivery.responseStatus || undefined,
      responseBody: prismaDelivery.responseBody || undefined,
      error: prismaDelivery.error || undefined,
      payload: prismaDelivery.payload as Record<string, unknown>,
      createdAt: prismaDelivery.createdAt,
      deliveredAt: prismaDelivery.deliveredAt || undefined,
    };
  }
}
