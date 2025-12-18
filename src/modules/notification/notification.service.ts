import { randomUUID } from 'crypto';
import { logger } from '../../core/logger.js';
import { BadRequestError } from '../../utils/errors.js';
import type {
  Notification,
  NotificationConfig,
  NotificationChannel,
  EmailMessage,
  SMSMessage,
  PushMessage,
  WebhookMessage,
  NotificationTemplate,
} from './types.js';

// In-memory storage
const notifications = new Map<string, Notification>();
const templates = new Map<string, NotificationTemplate>();

export class NotificationService {
  private config: NotificationConfig;

  constructor(config: NotificationConfig = {}) {
    this.config = config;
  }

  // Send notifications
  async send(
    userId: string,
    channel: NotificationChannel,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<Notification> {
    const notification: Notification = {
      id: randomUUID(),
      userId,
      channel,
      status: 'pending',
      title,
      body,
      data,
      createdAt: new Date(),
    };

    try {
      switch (channel) {
        case 'email':
          await this.sendEmail({ to: data?.email as string, subject: title, text: body });
          break;
        case 'sms':
          await this.sendSMS({ to: data?.phone as string, body });
          break;
        case 'push':
          await this.sendPush({ tokens: data?.tokens as string[], title, body });
          break;
        case 'webhook':
          await this.sendWebhook({ url: data?.url as string, body: { title, body, data } });
          break;
        case 'in_app':
          // Just store the notification
          break;
      }

      notification.status = 'sent';
      notification.sentAt = new Date();
    } catch (error) {
      notification.status = 'failed';
      logger.error({ error, notificationId: notification.id }, 'Failed to send notification');
    }

    notifications.set(notification.id, notification);
    return notification;
  }

  async sendToUser(
    userId: string,
    channels: NotificationChannel[],
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<Notification[]> {
    const results: Notification[] = [];
    for (const channel of channels) {
      const notification = await this.send(userId, channel, title, body, data);
      results.push(notification);
    }
    return results;
  }

  // Email methods
  async sendEmail(message: EmailMessage): Promise<void> {
    if (!this.config.email) {
      throw new BadRequestError('Email not configured');
    }

    const { provider } = this.config.email;

    switch (provider) {
      case 'sendgrid':
        await this.sendEmailViaSendGrid(message);
        break;
      case 'resend':
        await this.sendEmailViaResend(message);
        break;
      case 'mailgun':
        await this.sendEmailViaMailgun(message);
        break;
      case 'ses':
        await this.sendEmailViaSES(message);
        break;
      default:
        await this.sendEmailViaSMTP(message);
    }

    logger.info({ to: message.to, subject: message.subject }, 'Email sent');
  }

  private async sendEmailViaSendGrid(message: EmailMessage): Promise<void> {
    const config = this.config.email!.sendgrid!;
    const body = await this.renderTemplate(message);

    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: Array.isArray(message.to)
              ? message.to.map((e) => ({ email: e }))
              : [{ email: message.to }],
          },
        ],
        from: { email: this.config.email!.from },
        subject: message.subject,
        content: [{ type: body.html ? 'text/html' : 'text/plain', value: body.html || body.text }],
      }),
    });
  }

  private async sendEmailViaResend(message: EmailMessage): Promise<void> {
    const config = this.config.email!.resend!;
    const body = await this.renderTemplate(message);

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.email!.from,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        html: body.html,
        text: body.text,
      }),
    });
  }

  private async sendEmailViaMailgun(message: EmailMessage): Promise<void> {
    const config = this.config.email!.mailgun!;
    const body = await this.renderTemplate(message);

    const formData = new FormData();
    formData.append('from', this.config.email!.from);
    formData.append('to', Array.isArray(message.to) ? message.to.join(',') : message.to);
    formData.append('subject', message.subject);
    if (body.html) formData.append('html', body.html);
    if (body.text) formData.append('text', body.text);

    await fetch(`https://api.mailgun.net/v3/${config.domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${config.apiKey}`).toString('base64')}`,
      },
      body: formData,
    });
  }

  private async sendEmailViaSES(_message: EmailMessage): Promise<void> {
    // AWS SES implementation - use @aws-sdk/client-ses in production
    logger.debug('SES email would be sent');
  }

  private async sendEmailViaSMTP(_message: EmailMessage): Promise<void> {
    // SMTP implementation - use nodemailer in production
    logger.debug('SMTP email would be sent');
  }

  // SMS methods
  async sendSMS(message: SMSMessage): Promise<void> {
    if (!this.config.sms) {
      throw new BadRequestError('SMS not configured');
    }

    const { provider } = this.config.sms;

    switch (provider) {
      case 'twilio':
        await this.sendSMSViaTwilio(message);
        break;
      case 'nexmo':
        await this.sendSMSViaNexmo(message);
        break;
      case 'africas_talking':
        await this.sendSMSViaAfricasTalking(message);
        break;
    }

    logger.info({ to: message.to }, 'SMS sent');
  }

  private async sendSMSViaTwilio(message: SMSMessage): Promise<void> {
    const config = this.config.sms!.twilio!;
    const recipients = Array.isArray(message.to) ? message.to : [message.to];

    for (const to of recipients) {
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: this.config.sms!.from,
          To: to,
          Body: message.body,
        }),
      });
    }
  }

  private async sendSMSViaNexmo(message: SMSMessage): Promise<void> {
    const config = this.config.sms!.nexmo!;
    const recipients = Array.isArray(message.to) ? message.to : [message.to];

    for (const to of recipients) {
      await fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: config.apiKey,
          api_secret: config.apiSecret,
          from: this.config.sms!.from,
          to,
          text: message.body,
        }),
      });
    }
  }

  private async sendSMSViaAfricasTalking(message: SMSMessage): Promise<void> {
    const config = this.config.sms!.africasTalking!;
    const recipients = Array.isArray(message.to) ? message.to.join(',') : message.to;

    await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey: config.apiKey,
      },
      body: new URLSearchParams({
        username: config.username,
        to: recipients,
        message: message.body,
        from: this.config.sms!.from,
      }),
    });
  }

  // Push notification methods
  async sendPush(message: PushMessage): Promise<void> {
    if (!this.config.push) {
      throw new BadRequestError('Push notifications not configured');
    }

    const { provider } = this.config.push;

    switch (provider) {
      case 'firebase':
        await this.sendPushViaFirebase(message);
        break;
      case 'onesignal':
        await this.sendPushViaOneSignal(message);
        break;
    }

    logger.info({ tokens: message.tokens.length }, 'Push notification sent');
  }

  private async sendPushViaFirebase(message: PushMessage): Promise<void> {
    // Firebase Cloud Messaging - use firebase-admin in production
    logger.debug({ message }, 'Firebase push would be sent');
  }

  private async sendPushViaOneSignal(message: PushMessage): Promise<void> {
    const config = this.config.push!.onesignal!;

    await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: config.appId,
        include_player_ids: message.tokens,
        headings: { en: message.title },
        contents: { en: message.body },
        data: message.data,
        ios_badgeType: 'SetTo',
        ios_badgeCount: message.badge,
      }),
    });
  }

  // Webhook methods
  async sendWebhook(message: WebhookMessage): Promise<void> {
    const config = this.config.webhook || {};
    const method = message.method || 'POST';

    const response = await fetch(message.url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...config.defaultHeaders,
        ...message.headers,
      },
      body: JSON.stringify(message.body),
      signal: AbortSignal.timeout(config.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }

    logger.info({ url: message.url, method }, 'Webhook sent');
  }

  // Template methods
  async registerTemplate(
    template: Omit<NotificationTemplate, 'id'>
  ): Promise<NotificationTemplate> {
    const id = randomUUID();
    const fullTemplate = { ...template, id };
    templates.set(id, fullTemplate);
    return fullTemplate;
  }

  private async renderTemplate(message: EmailMessage): Promise<{ text?: string; html?: string }> {
    if (!message.template) {
      return { text: message.text, html: message.html };
    }

    const template = templates.get(message.template);
    if (!template) {
      return { text: message.text, html: message.html };
    }

    let rendered = template.body;
    for (const [key, value] of Object.entries(message.templateData || {})) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    return { html: rendered, text: rendered.replace(/<[^>]*>/g, '') };
  }

  // In-app notification methods
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const userNotifications: Notification[] = [];
    for (const notification of notifications.values()) {
      if (notification.userId === userId) {
        userNotifications.push(notification);
      }
    }
    return userNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUnreadCount(userId: string): Promise<number> {
    let count = 0;
    for (const notification of notifications.values()) {
      if (
        notification.userId === userId &&
        notification.channel === 'in_app' &&
        !notification.readAt
      ) {
        count++;
      }
    }
    return count;
  }

  async markAsRead(notificationId: string): Promise<Notification | null> {
    const notification = notifications.get(notificationId);
    if (!notification) return null;

    notification.readAt = new Date();
    notification.status = 'read';
    notifications.set(notificationId, notification);
    return notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    let count = 0;
    for (const notification of notifications.values()) {
      if (notification.userId === userId && !notification.readAt) {
        notification.readAt = new Date();
        notification.status = 'read';
        count++;
      }
    }
    return count;
  }
}

let notificationService: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService();
  }
  return notificationService;
}

export function createNotificationService(config: NotificationConfig): NotificationService {
  notificationService = new NotificationService(config);
  return notificationService;
}
