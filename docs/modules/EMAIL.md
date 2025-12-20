# Email Module

SMTP email service with templates and common transactional emails.

## Features

- **SMTP Support** - Works with any SMTP provider
- **Templates** - Built-in email templates
- **Auto Plain Text** - Generates plain text from HTML
- **Attachments** - Support for file attachments
- **Connection Verification** - Verify SMTP connection

## Usage

### Configuration

```typescript
import { createEmailService } from 'servcraft/modules/email';

const emailService = createEmailService({
  host: 'smtp.example.com',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SMTP_PASSWORD!,
  },
  from: 'noreply@myapp.com',
});

// Verify connection
const isConnected = await emailService.verify();
```

### Sending Emails

```typescript
// Simple email
const result = await emailService.send({
  to: 'user@example.com',
  subject: 'Hello!',
  text: 'This is a plain text email.',
  html: '<h1>Hello!</h1><p>This is an HTML email.</p>',
});

// Multiple recipients
await emailService.send({
  to: ['user1@example.com', 'user2@example.com'],
  cc: 'manager@example.com',
  bcc: 'archive@example.com',
  subject: 'Team Update',
  html: '<p>Weekly update...</p>',
});

// With attachments
await emailService.send({
  to: 'user@example.com',
  subject: 'Your Invoice',
  html: '<p>Please find your invoice attached.</p>',
  attachments: [
    {
      filename: 'invoice.pdf',
      path: '/path/to/invoice.pdf',
    },
    {
      filename: 'data.json',
      content: JSON.stringify(data),
    },
  ],
});
```

### Built-in Templates

```typescript
// Welcome email
await emailService.sendWelcome(
  'user@example.com',
  'John',
  'https://myapp.com/verify?token=xyz'
);

// Email verification
await emailService.sendVerifyEmail(
  'user@example.com',
  'John',
  'https://myapp.com/verify?token=xyz'
);

// Password reset
await emailService.sendPasswordReset(
  'user@example.com',
  'John',
  'https://myapp.com/reset?token=xyz'
);

// Password changed notification
await emailService.sendPasswordChanged(
  'user@example.com',
  'John',
  '192.168.1.1',
  'Chrome on Windows'
);

// Login alert
await emailService.sendLoginAlert(
  'user@example.com',
  'John',
  '192.168.1.1',
  'Chrome on Windows',
  'New York, US'
);
```

### Custom Templates

```typescript
// Using template with data
await emailService.send({
  to: 'user@example.com',
  subject: 'Order Confirmation',
  template: 'order-confirmation',
  data: {
    orderId: 'ORD-123',
    userName: 'John',
    total: '$99.99',
    items: [
      { name: 'Product 1', price: '$49.99' },
      { name: 'Product 2', price: '$50.00' },
    ],
  },
});
```

## Configuration Types

```typescript
interface EmailConfig {
  host: string;
  port: number;
  secure?: boolean; // true for 465, false for other ports
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  data?: TemplateData;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Attachment[];
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
```

## Built-in Template Variables

| Template | Variables |
|----------|-----------|
| `welcome` | `userName`, `userEmail`, `actionUrl`, `appName` |
| `verify-email` | `userName`, `userEmail`, `actionUrl`, `expiresIn` |
| `password-reset` | `userName`, `userEmail`, `actionUrl`, `expiresIn` |
| `password-changed` | `userName`, `ipAddress`, `userAgent`, `timestamp` |
| `login-alert` | `userName`, `ipAddress`, `userAgent`, `location`, `timestamp` |

## Provider Examples

### SendGrid SMTP

```typescript
const emailService = createEmailService({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY!,
  },
  from: 'noreply@myapp.com',
});
```

### Gmail SMTP

```typescript
const emailService = createEmailService({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: 'your-email@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD!, // Use App Password
  },
  from: 'your-email@gmail.com',
});
```

### Amazon SES SMTP

```typescript
const emailService = createEmailService({
  host: 'email-smtp.us-east-1.amazonaws.com',
  port: 587,
  auth: {
    user: process.env.AWS_SES_SMTP_USER!,
    pass: process.env.AWS_SES_SMTP_PASS!,
  },
  from: 'noreply@myapp.com',
});
```

### Mailgun SMTP

```typescript
const emailService = createEmailService({
  host: 'smtp.mailgun.org',
  port: 587,
  auth: {
    user: 'postmaster@mg.myapp.com',
    pass: process.env.MAILGUN_SMTP_PASSWORD!,
  },
  from: 'noreply@myapp.com',
});
```

## Development Mode

If no SMTP configuration is provided, emails are logged instead of sent:

```typescript
const emailService = createEmailService({}); // No config
await emailService.send({ to: 'test@example.com', subject: 'Test' });
// Logs: "Email would be sent (no transporter configured)"
// Returns: { success: true, messageId: 'dev-mode' }
```

## Best Practices

1. **Use Templates** - Consistent branding and easier maintenance
2. **Plain Text Fallback** - Always include plain text version
3. **Verify Connection** - Check SMTP connection on startup
4. **Handle Failures** - Implement retry logic for failed emails
5. **Rate Limiting** - Respect provider rate limits
6. **SPF/DKIM** - Configure DNS records for deliverability
