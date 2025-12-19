import { randomUUID } from 'crypto';
import { logger } from '../../core/logger.js';
import type {
  ChatMessage,
  PresenceStatus,
  Notification,
  TypingIndicator,
  LiveEvent,
} from './types.js';
import type { WebSocketService } from './websocket.service.js';

// Storage
const presenceStatus = new Map<string, PresenceStatus>();
const notifications = new Map<string, Notification[]>();
const typingIndicators = new Map<string, Map<string, TypingIndicator>>();

/**
 * Chat Feature
 * Real-time chat functionality
 */
export class ChatFeature {
  constructor(private ws: WebSocketService) {}

  /**
   * Send chat message
   */
  async sendMessage(
    roomId: string,
    userId: string,
    content: string,
    options?: {
      replyTo?: string;
      mentions?: string[];
      attachments?: ChatMessage['attachments'];
    }
  ): Promise<ChatMessage> {
    const message = (await this.ws.sendMessage(
      roomId,
      userId,
      content,
      'text',
      options
    )) as ChatMessage;

    message.replyTo = options?.replyTo;
    message.mentions = options?.mentions;
    message.attachments = options?.attachments;

    // Broadcast to room
    await this.ws.broadcastToRoom(roomId, 'chat:message', message);

    // Notify mentioned users
    if (options?.mentions) {
      await this.notifyMentions(options.mentions, message);
    }

    logger.debug({ messageId: message.id, roomId, userId }, 'Chat message sent');

    return message;
  }

  /**
   * Edit message
   */
  async editMessage(
    messageId: string,
    roomId: string,
    userId: string,
    newContent: string
  ): Promise<void> {
    const messages = this.ws.getRoomMessages(roomId, 1000);
    const message = messages.find((m) => m.id === messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.userId !== userId) {
      throw new Error('Unauthorized');
    }

    message.content = newContent;
    message.edited = true;
    message.editedAt = new Date();

    await this.ws.broadcastToRoom(roomId, 'chat:message:edited', {
      messageId,
      content: newContent,
      editedAt: message.editedAt,
    });

    logger.debug({ messageId, roomId, userId }, 'Message edited');
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string, roomId: string, userId: string): Promise<void> {
    const messages = this.ws.getRoomMessages(roomId, 1000);
    const messageIndex = messages.findIndex((m) => m.id === messageId);

    if (messageIndex === -1) {
      throw new Error('Message not found');
    }

    const message = messages[messageIndex];

    if (!message || message.userId !== userId) {
      throw new Error('Unauthorized');
    }

    messages.splice(messageIndex, 1);

    await this.ws.broadcastToRoom(roomId, 'chat:message:deleted', {
      messageId,
      roomId,
    });

    logger.debug({ messageId, roomId, userId }, 'Message deleted');
  }

  /**
   * Start typing indicator
   */
  async startTyping(roomId: string, userId: string, username?: string): Promise<void> {
    if (!typingIndicators.has(roomId)) {
      typingIndicators.set(roomId, new Map());
    }

    const roomTyping = typingIndicators.get(roomId)!;
    roomTyping.set(userId, {
      userId,
      username,
      roomId,
      timestamp: new Date(),
    });

    await this.ws.broadcastToRoom(
      roomId,
      'chat:typing:start',
      { userId, username },
      { except: this.ws.getUserSockets(userId) }
    );

    logger.debug({ roomId, userId }, 'User started typing');

    // Auto-stop after 5 seconds
    setTimeout(() => {
      this.stopTyping(roomId, userId);
    }, 5000);
  }

  /**
   * Stop typing indicator
   */
  async stopTyping(roomId: string, userId: string): Promise<void> {
    const roomTyping = typingIndicators.get(roomId);

    if (roomTyping) {
      roomTyping.delete(userId);

      await this.ws.broadcastToRoom(
        roomId,
        'chat:typing:stop',
        { userId },
        { except: this.ws.getUserSockets(userId) }
      );

      logger.debug({ roomId, userId }, 'User stopped typing');
    }
  }

  /**
   * Get typing users in room
   */
  getTypingUsers(roomId: string): TypingIndicator[] {
    const roomTyping = typingIndicators.get(roomId);

    if (!roomTyping) {
      return [];
    }

    return Array.from(roomTyping.values());
  }

  /**
   * Notify mentioned users
   */
  private async notifyMentions(userIds: string[], message: ChatMessage): Promise<void> {
    for (const userId of userIds) {
      if (this.ws.isUserOnline(userId)) {
        await this.ws.broadcastToUsers([userId], 'chat:mention', {
          messageId: message.id,
          roomId: message.roomId,
          from: message.username,
          content: message.content,
        });
      }
    }
  }
}

/**
 * Presence Feature
 * User online/offline status tracking
 */
export class PresenceFeature {
  constructor(private ws: WebSocketService) {
    // Listen to connection events
    ws.on('connection', (user) => {
      this.updateStatus(user.id, 'online');
    });

    ws.on('disconnect', (user) => {
      this.updateStatus(user.id, 'offline');
    });
  }

  /**
   * Update user status
   */
  async updateStatus(
    userId: string,
    status: PresenceStatus['status'],
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const presence: PresenceStatus = {
      userId,
      status,
      lastSeen: new Date(),
      metadata,
    };

    presenceStatus.set(userId, presence);

    // Broadcast status change
    await this.ws.broadcastToAll('presence:status', presence);

    logger.debug({ userId, status }, 'Presence status updated');
  }

  /**
   * Get user status
   */
  getStatus(userId: string): PresenceStatus | null {
    return presenceStatus.get(userId) || null;
  }

  /**
   * Get multiple user statuses
   */
  getStatuses(userIds: string[]): PresenceStatus[] {
    return userIds
      .map((userId) => presenceStatus.get(userId))
      .filter((status): status is PresenceStatus => status !== undefined);
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): PresenceStatus[] {
    return Array.from(presenceStatus.values()).filter((status) => status.status === 'online');
  }

  /**
   * Subscribe to user status changes
   */
  async subscribeToUsers(socketId: string, userIds: string[]): Promise<void> {
    // Send current statuses
    const statuses = this.getStatuses(userIds);

    await this.ws.emitToSocket(socketId, 'presence:statuses', statuses);

    logger.debug({ socketId, userCount: userIds.length }, 'Subscribed to user statuses');
  }
}

/**
 * Notification Feature
 * Real-time notifications
 */
export class NotificationFeature {
  constructor(private ws: WebSocketService) {}

  /**
   * Send notification to user
   */
  async send(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<Notification> {
    const notification: Notification = {
      id: randomUUID(),
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: new Date(),
    };

    // Store notification
    if (!notifications.has(userId)) {
      notifications.set(userId, []);
    }

    notifications.get(userId)!.push(notification);

    // Send to user if online
    if (this.ws.isUserOnline(userId)) {
      await this.ws.broadcastToUsers([userId], 'notification:new', notification);
    }

    logger.debug({ notificationId: notification.id, userId, type }, 'Notification sent');

    return notification;
  }

  /**
   * Send bulk notifications
   */
  async sendBulk(
    userIds: string[],
    type: string,
    title: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const promises = userIds.map((userId) => this.send(userId, type, title, message, data));

    await Promise.all(promises);

    logger.info({ userCount: userIds.length, type }, 'Bulk notifications sent');
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const userNotifications = notifications.get(userId);

    if (!userNotifications) {
      return;
    }

    const notification = userNotifications.find((n) => n.id === notificationId);

    if (notification) {
      notification.read = true;

      await this.ws.broadcastToUsers([userId], 'notification:read', {
        notificationId,
      });

      logger.debug({ notificationId, userId }, 'Notification marked as read');
    }
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    const userNotifications = notifications.get(userId);

    if (!userNotifications) {
      return;
    }

    userNotifications.forEach((notification) => {
      notification.read = true;
    });

    await this.ws.broadcastToUsers([userId], 'notification:all_read', {});

    logger.debug({ userId, count: userNotifications.length }, 'All notifications marked as read');
  }

  /**
   * Get user notifications
   */
  getNotifications(userId: string, unreadOnly = false): Notification[] {
    const userNotifications = notifications.get(userId) || [];

    if (unreadOnly) {
      return userNotifications.filter((n) => !n.read);
    }

    return userNotifications;
  }

  /**
   * Get unread count
   */
  getUnreadCount(userId: string): number {
    const userNotifications = notifications.get(userId) || [];

    return userNotifications.filter((n) => !n.read).length;
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const userNotifications = notifications.get(userId);

    if (!userNotifications) {
      return;
    }

    const index = userNotifications.findIndex((n) => n.id === notificationId);

    if (index !== -1) {
      userNotifications.splice(index, 1);

      await this.ws.broadcastToUsers([userId], 'notification:deleted', {
        notificationId,
      });

      logger.debug({ notificationId, userId }, 'Notification deleted');
    }
  }

  /**
   * Clear all notifications
   */
  async clearAll(userId: string): Promise<void> {
    notifications.set(userId, []);

    await this.ws.broadcastToUsers([userId], 'notification:cleared', {});

    logger.debug({ userId }, 'All notifications cleared');
  }
}

/**
 * Live Events Feature
 * Broadcast live events (analytics, updates, etc.)
 */
export class LiveEventsFeature {
  constructor(private ws: WebSocketService) {}

  /**
   * Broadcast live event
   */
  async broadcast(
    type: string,
    data: Record<string, unknown>,
    source?: string,
    targetUsers?: string[]
  ): Promise<void> {
    const event: LiveEvent = {
      id: randomUUID(),
      type,
      data,
      timestamp: new Date(),
      source,
    };

    if (targetUsers && targetUsers.length > 0) {
      await this.ws.broadcastToUsers(targetUsers, 'live:event', event);
    } else {
      await this.ws.broadcastToAll('live:event', event);
    }

    logger.debug(
      { eventId: event.id, type, targetCount: targetUsers?.length },
      'Live event broadcasted'
    );
  }

  /**
   * Broadcast analytics event
   */
  async broadcastAnalytics(
    metric: string,
    value: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.broadcast('analytics', {
      metric,
      value,
      ...metadata,
    });
  }

  /**
   * Broadcast system update
   */
  async broadcastSystemUpdate(
    message: string,
    severity: 'info' | 'warning' | 'error',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.broadcast('system_update', {
      message,
      severity,
      ...metadata,
    });
  }
}
