export interface EmailConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  data?: Record<string, unknown>;
  attachments?: EmailAttachment[];
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type EmailTemplate =
  | 'welcome'
  | 'verify-email'
  | 'password-reset'
  | 'password-changed'
  | 'login-alert'
  | 'account-suspended'
  | 'custom';

export interface TemplateData {
  appName?: string;
  userName?: string;
  userEmail?: string;
  actionUrl?: string;
  token?: string;
  expiresIn?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: unknown;
}
