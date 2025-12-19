import Handlebars from 'handlebars';

// Base layout template
const baseLayout = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
    .warning {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 6px;
      padding: 12px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">{{appName}}</div>
    </div>
    <div class="content">
      {{{body}}}
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{appName}}. All rights reserved.</p>
      <p>This email was sent to {{userEmail}}</p>
    </div>
  </div>
</body>
</html>
`;

// Individual templates
const templates: Record<string, string> = {
  welcome: `
    <h2>Welcome to {{appName}}!</h2>
    <p>Hi {{userName}},</p>
    <p>Thank you for joining {{appName}}. We're excited to have you on board!</p>
    <p>To get started, please verify your email address by clicking the button below:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{actionUrl}}" class="button">Verify Email</a>
    </p>
    <p>If you didn't create an account with us, you can safely ignore this email.</p>
  `,

  'verify-email': `
    <h2>Verify Your Email</h2>
    <p>Hi {{userName}},</p>
    <p>Please verify your email address by clicking the button below:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{actionUrl}}" class="button">Verify Email</a>
    </p>
    <p>This link will expire in {{expiresIn}}.</p>
    <p>If you didn't request this verification, you can safely ignore this email.</p>
  `,

  'password-reset': `
    <h2>Reset Your Password</h2>
    <p>Hi {{userName}},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{actionUrl}}" class="button">Reset Password</a>
    </p>
    <p>This link will expire in {{expiresIn}}.</p>
    <div class="warning">
      <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email and your password will remain unchanged.
    </div>
  `,

  'password-changed': `
    <h2>Password Changed</h2>
    <p>Hi {{userName}},</p>
    <p>Your password has been successfully changed.</p>
    <p>If you didn't make this change, please contact our support team immediately and secure your account.</p>
    <div class="warning">
      <strong>Details:</strong><br>
      Time: {{timestamp}}<br>
      IP Address: {{ipAddress}}<br>
      Device: {{userAgent}}
    </div>
  `,

  'login-alert': `
    <h2>New Login Detected</h2>
    <p>Hi {{userName}},</p>
    <p>We detected a new login to your account.</p>
    <div class="warning">
      <strong>Login Details:</strong><br>
      Time: {{timestamp}}<br>
      IP Address: {{ipAddress}}<br>
      Device: {{userAgent}}<br>
      Location: {{location}}
    </div>
    <p>If this was you, you can safely ignore this email.</p>
    <p>If you didn't log in, please change your password immediately and contact support.</p>
  `,

  'account-suspended': `
    <h2>Account Suspended</h2>
    <p>Hi {{userName}},</p>
    <p>Your account has been suspended due to: {{reason}}</p>
    <p>If you believe this is a mistake, please contact our support team.</p>
  `,
};

// Compile templates
const compiledLayout = Handlebars.compile(baseLayout);
const compiledTemplates: Record<string, HandlebarsTemplateDelegate> = {};

for (const [name, template] of Object.entries(templates)) {
  compiledTemplates[name] = Handlebars.compile(template);
}

export function renderTemplate(templateName: string, data: Record<string, unknown>): string {
  const template = compiledTemplates[templateName];

  if (!template) {
    throw new Error(`Template "${templateName}" not found`);
  }

  const body = template(data);

  return compiledLayout({
    ...data,
    body,
    year: new Date().getFullYear(),
    appName: data.appName || 'Servcraft',
  });
}

export function renderCustomTemplate(htmlTemplate: string, data: Record<string, unknown>): string {
  const template = Handlebars.compile(htmlTemplate);
  const body = template(data);

  return compiledLayout({
    ...data,
    body,
    year: new Date().getFullYear(),
    appName: data.appName || 'Servcraft',
  });
}

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('ne', (a, b) => a !== b);
