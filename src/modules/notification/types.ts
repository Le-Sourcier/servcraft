export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | 'webhook';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export interface Notification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

export interface NotificationConfig {
  email?: EmailConfig;
  sms?: SMSConfig;
  push?: PushConfig;
  webhook?: WebhookConfig;
}

// Email configuration
export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun' | 'resend';
  from: string;
  replyTo?: string;
  smtp?: SMTPConfig;
  sendgrid?: { apiKey: string };
  ses?: { region: string; accessKeyId: string; secretAccessKey: string };
  mailgun?: { apiKey: string; domain: string };
  resend?: { apiKey: string };
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  attachments?: EmailAttachment[];
  cc?: string[];
  bcc?: string[];
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

// SMS configuration
export interface SMSConfig {
  provider: 'twilio' | 'nexmo' | 'africas_talking';
  from: string;
  twilio?: { accountSid: string; authToken: string };
  nexmo?: { apiKey: string; apiSecret: string };
  africasTalking?: { username: string; apiKey: string };
}

export interface SMSMessage {
  to: string | string[];
  body: string;
}

// Push notification configuration
export interface PushConfig {
  provider: 'firebase' | 'onesignal' | 'pusher';
  firebase?: { serviceAccount: string | object };
  onesignal?: { appId: string; apiKey: string };
  pusher?: { appId: string; key: string; secret: string; cluster: string };
}

export interface PushMessage {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
  imageUrl?: string;
}

// Webhook configuration
export interface WebhookConfig {
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface WebhookMessage {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  body: unknown;
}

// Template support
export interface NotificationTemplate {
  id: string;
  name: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  variables: string[];
}
