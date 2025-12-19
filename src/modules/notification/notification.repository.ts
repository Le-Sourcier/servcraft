/**
 * Notification Repository
 * Prisma-based persistence for notifications and templates
 */
import { Prisma } from '@prisma/client';
import type {
  Notification as PrismaNotification,
  NotificationTemplate as PrismaTemplate,
  NotificationChannel as PrismaChannel,
  NotificationStatus as PrismaStatus,
  PrismaClient,
} from '@prisma/client';
import { logger } from '../../core/logger.js';
import type { Notification, NotificationTemplate, NotificationChannel } from './types.js';

// Enum mappings (Prisma UPPERCASE ↔ Application lowercase)
const channelToPrisma: Record<NotificationChannel, PrismaChannel> = {
  email: 'EMAIL',
  sms: 'SMS',
  push: 'PUSH',
  webhook: 'WEBHOOK',
  in_app: 'IN_APP',
};

const channelFromPrisma: Record<PrismaChannel, NotificationChannel> = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  WEBHOOK: 'webhook',
  IN_APP: 'in_app',
};

type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

const statusToPrisma: Record<NotificationStatus, PrismaStatus> = {
  pending: 'PENDING',
  sent: 'SENT',
  failed: 'FAILED',
  read: 'READ',
};

const statusFromPrisma: Record<PrismaStatus, NotificationStatus> = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  READ: 'read',
};

export class NotificationRepository {
  constructor(private prisma: PrismaClient) {}

  // ==========================================
  // NOTIFICATION METHODS
  // ==========================================

  /**
   * Create a notification
   */
  async createNotification(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        channel: channelToPrisma[data.channel],
        status: statusToPrisma[data.status as NotificationStatus],
        title: data.title,
        body: data.body,
        data: data.data as Prisma.InputJsonValue,
        sentAt: data.sentAt,
        readAt: data.readAt,
      },
    });

    return this.mapNotificationFromPrisma(notification);
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: string): Promise<Notification | null> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    return notification ? this.mapNotificationFromPrisma(notification) : null;
  }

  /**
   * Update notification
   */
  async updateNotification(
    id: string,
    data: Partial<Omit<Notification, 'id' | 'createdAt'>>
  ): Promise<Notification | null> {
    try {
      const updateData: Prisma.NotificationUpdateInput = {};

      if (data.status !== undefined) {
        updateData.status = statusToPrisma[data.status as NotificationStatus];
      }
      if (data.sentAt !== undefined) {
        updateData.sentAt = data.sentAt;
      }
      if (data.readAt !== undefined) {
        updateData.readAt = data.readAt;
      }
      if (data.data !== undefined) {
        updateData.data = data.data as Prisma.InputJsonValue;
      }

      const notification = await this.prisma.notification.update({
        where: { id },
        data: updateData,
      });

      return this.mapNotificationFromPrisma(notification);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get notifications by user ID
   */
  async getNotificationsByUserId(
    userId: string,
    options?: {
      channel?: NotificationChannel;
      status?: NotificationStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Notification[]> {
    const where: Prisma.NotificationWhereInput = { userId };

    if (options?.channel) {
      where.channel = channelToPrisma[options.channel];
    }
    if (options?.status) {
      where.status = statusToPrisma[options.status];
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });

    return notifications.map((n) => this.mapNotificationFromPrisma(n));
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        channel: 'IN_APP',
        readAt: null,
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<Notification | null> {
    return this.updateNotification(id, {
      status: 'read',
      readAt: new Date(),
    });
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<boolean> {
    try {
      await this.prisma.notification.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete old notifications
   */
  async deleteOldNotifications(olderThan: Date): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: olderThan },
      },
    });

    logger.info({ count: result.count, olderThan }, 'Deleted old notifications');
    return result.count;
  }

  // ==========================================
  // TEMPLATE METHODS
  // ==========================================

  /**
   * Create a notification template
   */
  async createTemplate(data: Omit<NotificationTemplate, 'id'>): Promise<NotificationTemplate> {
    const template = await this.prisma.notificationTemplate.create({
      data: {
        name: data.name,
        channel: channelToPrisma[data.channel],
        subject: data.subject,
        body: data.body,
        variables: data.variables as Prisma.InputJsonValue,
        active: true,
      },
    });

    return this.mapTemplateFromPrisma(template);
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<NotificationTemplate | null> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    return template ? this.mapTemplateFromPrisma(template) : null;
  }

  /**
   * Get template by name
   */
  async getTemplateByName(name: string): Promise<NotificationTemplate | null> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { name },
    });

    return template ? this.mapTemplateFromPrisma(template) : null;
  }

  /**
   * Get all templates
   */
  async getAllTemplates(activeOnly = true): Promise<NotificationTemplate[]> {
    const templates = await this.prisma.notificationTemplate.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { name: 'asc' },
    });

    return templates.map((t) => this.mapTemplateFromPrisma(t));
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    data: Partial<Omit<NotificationTemplate, 'id'>>
  ): Promise<NotificationTemplate | null> {
    try {
      const updateData: Prisma.NotificationTemplateUpdateInput = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.channel !== undefined) updateData.channel = channelToPrisma[data.channel];
      if (data.subject !== undefined) updateData.subject = data.subject;
      if (data.body !== undefined) updateData.body = data.body;
      if (data.variables !== undefined)
        updateData.variables = data.variables as Prisma.InputJsonValue;

      const template = await this.prisma.notificationTemplate.update({
        where: { id },
        data: updateData,
      });

      return this.mapTemplateFromPrisma(template);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      await this.prisma.notificationTemplate.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  // ==========================================
  // MAPPING HELPERS
  // ==========================================

  private mapNotificationFromPrisma(prismaNotification: PrismaNotification): Notification {
    return {
      id: prismaNotification.id,
      userId: prismaNotification.userId,
      channel: channelFromPrisma[prismaNotification.channel],
      status: statusFromPrisma[prismaNotification.status],
      title: prismaNotification.title,
      body: prismaNotification.body,
      data: prismaNotification.data as Record<string, unknown> | undefined,
      sentAt: prismaNotification.sentAt || undefined,
      readAt: prismaNotification.readAt || undefined,
      createdAt: prismaNotification.createdAt,
    };
  }

  private mapTemplateFromPrisma(prismaTemplate: PrismaTemplate): NotificationTemplate {
    return {
      id: prismaTemplate.id,
      name: prismaTemplate.name,
      channel: channelFromPrisma[prismaTemplate.channel],
      subject: prismaTemplate.subject || undefined,
      body: prismaTemplate.body,
      variables: (prismaTemplate.variables as string[]) || [],
    };
  }
}
