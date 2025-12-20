# Notification Module

Multi-channel notification system with templates and persistent storage.

## Features

- **Multi-Channel** - Email, SMS, Push, Webhook, In-App
- **Multiple Providers** - SendGrid, Resend, Twilio, Firebase, etc.
- **Templates** - Reusable notification templates with variables
- **Persistence** - All notifications stored in database
- **In-App Notifications** - Read/unread tracking

## Supported Providers

| Channel | Providers |
|---------|-----------|
| Email | SendGrid, Resend, Mailgun, AWS SES, SMTP |
| SMS | Twilio, Nexmo (Vonage), Africa's Talking |
| Push | Firebase Cloud Messaging, OneSignal |
| Webhook | Any HTTP endpoint |
| In-App | Database storage |

## Usage

### Configuration

```typescript
import { createNotificationService } from 'servcraft/modules/notification';

const notificationService = createNotificationService({
  email: {
    provider: 'sendgrid',
    from: 'noreply@myapp.com',
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY!,
    },
  },
  sms: {
    provider: 'twilio',
    from: '+1234567890',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
    },
  },
  push: {
    provider: 'firebase',
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    },
  },
});
```

### Sending Notifications

```typescript
// Send single notification
const notification = await notificationService.send(
  'user-123',
  'email',
  'Welcome to MyApp',
  'Thank you for signing up!',
  { email: 'user@example.com' }
);

// Send to multiple channels
const notifications = await notificationService.sendToUser(
  'user-123',
  ['email', 'push', 'in_app'],
  'New Message',
  'You have a new message from John',
  {
    email: 'user@example.com',
    tokens: ['fcm-token-1', 'fcm-token-2'],
  }
);
```

### Email

```typescript
// Simple email
await notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  text: 'Welcome to our platform.',
  html: '<h1>Welcome!</h1><p>Welcome to our platform.</p>',
});

// With template
await notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Order Confirmation',
  template: 'order-confirmation',
  templateData: {
    orderId: 'ORD-123',
    total: '$99.99',
    items: '3 items',
  },
});

// Multiple recipients
await notificationService.sendEmail({
  to: ['user1@example.com', 'user2@example.com'],
  subject: 'Team Update',
  text: 'Here is the weekly update...',
});
```

### SMS

```typescript
await notificationService.sendSMS({
  to: '+1234567890',
  body: 'Your verification code is: 123456',
});

// Multiple recipients
await notificationService.sendSMS({
  to: ['+1234567890', '+0987654321'],
  body: 'Flash sale starts now!',
});
```

### Push Notifications

```typescript
await notificationService.sendPush({
  tokens: ['fcm-token-1', 'fcm-token-2'],
  title: 'New Message',
  body: 'You have a new message',
  data: {
    type: 'message',
    messageId: 'msg-123',
  },
  badge: 5,
});
```

### Webhooks

```typescript
await notificationService.sendWebhook({
  url: 'https://example.com/webhook',
  method: 'POST',
  headers: {
    'X-Custom-Header': 'value',
  },
  body: {
    event: 'user.created',
    data: { userId: 'user-123' },
  },
});
```

### In-App Notifications

```typescript
// Send in-app notification
await notificationService.send(
  'user-123',
  'in_app',
  'New Feature Available',
  'Check out our new dashboard!'
);

// Get user's notifications
const notifications = await notificationService.getUserNotifications('user-123', {
  limit: 20,
  offset: 0,
});

// Get unread count
const unreadCount = await notificationService.getUnreadCount('user-123');

// Mark as read
await notificationService.markAsRead(notificationId);

// Mark all as read
await notificationService.markAllAsRead('user-123');
```

### Templates

```typescript
// Register template
await notificationService.registerTemplate({
  name: 'welcome-email',
  channel: 'email',
  subject: 'Welcome to {{appName}}!',
  body: `
    <h1>Welcome, {{userName}}!</h1>
    <p>Thank you for joining {{appName}}.</p>
    <p>Get started by visiting your <a href="{{dashboardUrl}}">dashboard</a>.</p>
  `,
});

// Get template
const template = await notificationService.getTemplate('welcome-email');

// List all templates
const templates = await notificationService.getAllTemplates();

// Use template
await notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  template: 'welcome-email',
  templateData: {
    appName: 'MyApp',
    userName: 'John',
    dashboardUrl: 'https://myapp.com/dashboard',
  },
});
```

### Cleanup

```typescript
// Delete notifications older than 30 days
const deleted = await notificationService.cleanupOldNotifications(30);
```

## Configuration Types

```typescript
interface NotificationConfig {
  email?: {
    provider: 'sendgrid' | 'resend' | 'mailgun' | 'ses' | 'smtp';
    from: string;
    sendgrid?: { apiKey: string };
    resend?: { apiKey: string };
    mailgun?: { apiKey: string; domain: string };
    ses?: { region: string; accessKeyId: string; secretAccessKey: string };
    smtp?: { host: string; port: number; user: string; pass: string };
  };
  sms?: {
    provider: 'twilio' | 'nexmo' | 'africas_talking';
    from: string;
    twilio?: { accountSid: string; authToken: string };
    nexmo?: { apiKey: string; apiSecret: string };
    africasTalking?: { apiKey: string; username: string };
  };
  push?: {
    provider: 'firebase' | 'onesignal';
    firebase?: { projectId: string; privateKey: string; clientEmail: string };
    onesignal?: { appId: string; apiKey: string };
  };
  webhook?: {
    defaultHeaders?: Record<string, string>;
    timeout?: number;
  };
}
```

## Notification Status

```typescript
type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

interface Notification {
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
```

## Database Schema

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notification_templates (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Best Practices

1. **Use Templates** - Create templates for consistent messaging
2. **Handle Failures** - Check notification status and implement retries
3. **Rate Limiting** - Implement rate limits to avoid spam
4. **User Preferences** - Let users choose notification channels
5. **Cleanup** - Regularly clean up old notifications
6. **Logging** - Log all notification attempts for debugging
