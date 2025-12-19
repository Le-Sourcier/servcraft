import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../../config/index.js';
import { logger } from '../../core/logger.js';
import { renderTemplate } from './templates.js';
import type { EmailOptions, EmailResult, EmailConfig, TemplateData } from './types.js';

export class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor(emailConfig?: Partial<EmailConfig>) {
    if (emailConfig?.host || config.email.host) {
      this.config = {
        host: emailConfig?.host || config.email.host || '',
        port: emailConfig?.port || config.email.port || 587,
        secure: (emailConfig?.port || config.email.port || 587) === 465,
        auth: {
          user: emailConfig?.auth?.user || config.email.user || '',
          pass: emailConfig?.auth?.pass || config.email.pass || '',
        },
        from: emailConfig?.from || config.email.from || 'noreply@localhost',
      };

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
      });

      logger.info('Email service initialized');
    } else {
      logger.warn('Email service not configured - emails will be logged only');
    }
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      let html = options.html;
      let text = options.text;

      // Render template if provided
      if (options.template && options.data) {
        html = renderTemplate(options.template, options.data);
      }

      // Generate plain text from HTML if not provided
      if (html && !text) {
        text = this.htmlToText(html);
      }

      const mailOptions = {
        from: this.config?.from || 'noreply@localhost',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html,
        text,
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
      };

      // If no transporter, just log the email
      if (!this.transporter) {
        logger.info({ email: mailOptions }, 'Email would be sent (no transporter configured)');
        return { success: true, messageId: 'dev-mode' };
      }

      const result = await this.transporter.sendMail(mailOptions);

      logger.info({ messageId: result.messageId, to: options.to }, 'Email sent successfully');

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ err: error, to: options.to }, 'Failed to send email');

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async sendTemplate(to: string, template: string, data: TemplateData): Promise<EmailResult> {
    const subjects: Record<string, string> = {
      welcome: `Welcome to ${data.appName || 'Servcraft'}!`,
      'verify-email': 'Verify Your Email',
      'password-reset': 'Reset Your Password',
      'password-changed': 'Password Changed Successfully',
      'login-alert': 'New Login Detected',
      'account-suspended': 'Account Suspended',
    };

    return this.send({
      to,
      subject: subjects[template] || 'Notification',
      template,
      data,
    });
  }

  async sendWelcome(email: string, name: string, verifyUrl?: string): Promise<EmailResult> {
    return this.sendTemplate(email, 'welcome', {
      userName: name,
      userEmail: email,
      actionUrl: verifyUrl,
    });
  }

  async sendVerifyEmail(email: string, name: string, verifyUrl: string): Promise<EmailResult> {
    return this.sendTemplate(email, 'verify-email', {
      userName: name,
      userEmail: email,
      actionUrl: verifyUrl,
      expiresIn: '24 hours',
    });
  }

  async sendPasswordReset(email: string, name: string, resetUrl: string): Promise<EmailResult> {
    return this.sendTemplate(email, 'password-reset', {
      userName: name,
      userEmail: email,
      actionUrl: resetUrl,
      expiresIn: '1 hour',
    });
  }

  async sendPasswordChanged(
    email: string,
    name: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<EmailResult> {
    return this.sendTemplate(email, 'password-changed', {
      userName: name,
      userEmail: email,
      ipAddress: ipAddress || 'Unknown',
      userAgent: userAgent || 'Unknown',
      timestamp: new Date().toISOString(),
    });
  }

  async sendLoginAlert(
    email: string,
    name: string,
    ipAddress: string,
    userAgent: string,
    location?: string
  ): Promise<EmailResult> {
    return this.sendTemplate(email, 'login-alert', {
      userName: name,
      userEmail: email,
      ipAddress,
      userAgent,
      location: location || 'Unknown',
      timestamp: new Date().toISOString(),
    });
  }

  async verify(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Email service connection failed');
      return false;
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

let emailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
}

export function createEmailService(config?: Partial<EmailConfig>): EmailService {
  return new EmailService(config);
}
