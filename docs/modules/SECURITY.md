# Security Module

Comprehensive security features for protecting your application against common web vulnerabilities.

## Features

- **Input Sanitization** - XSS prevention with HTML escaping and script stripping
- **CSRF Protection** - Token-based Cross-Site Request Forgery protection
- **Security Headers** - Essential HTTP security headers
- **HPP Protection** - HTTP Parameter Pollution prevention
- **Suspicious Activity Detection** - Pattern-based attack detection
- **Security Audit Logging** - Comprehensive security event tracking

## Installation

The security module is included in ServCraft by default.

```typescript
import {
  registerSecurityMiddlewares,
  sanitizeString,
  sanitizeObject,
  getSecurityAuditService,
} from 'servcraft/modules/security';
```

## Quick Start

### Register All Security Middlewares

```typescript
import Fastify from 'fastify';
import { registerSecurityMiddlewares } from 'servcraft/modules/security';

const app = Fastify();

await registerSecurityMiddlewares(app, {
  sanitize: true,           // Input sanitization
  csrf: false,              // CSRF (disabled for API-first apps)
  hpp: true,                // HTTP Parameter Pollution protection
  headers: true,            // Security headers
  sizeLimit: 10 * 1024 * 1024,  // 10MB request size limit
  suspicionDetection: true, // Suspicious activity detection
});
```

## Input Sanitization

### Basic String Sanitization

```typescript
import { sanitizeString, escapeHtml, stripDangerousHtml } from 'servcraft/modules/security';

// Escape HTML entities
const safe = escapeHtml('<script>alert("xss")</script>');
// Result: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'

// Strip dangerous HTML
const stripped = stripDangerousHtml('<div onclick="evil()">Safe text</div>');
// Result: '<div>Safe text</div>'

// Full sanitization
const sanitized = sanitizeString(userInput, {
  escapeHtmlChars: true,  // Escape HTML entities
  stripScripts: true,     // Remove script tags and event handlers
  trim: true,             // Trim whitespace
  maxLength: 1000,        // Limit string length
});
```

### Object Sanitization

```typescript
import { sanitizeObject } from 'servcraft/modules/security';

const userInput = {
  name: '<script>alert("xss")</script>',
  email: 'user@example.com',
  bio: 'Hello <img onerror="evil()" src="x">',
};

const safe = sanitizeObject(userInput, {
  escapeHtmlChars: true,
  stripScripts: true,
});
// All string values are sanitized recursively
// Prototype pollution keys (__proto__, constructor) are removed
```

### URL Sanitization

```typescript
import { sanitizeUrl } from 'servcraft/modules/security';

sanitizeUrl('https://example.com');     // Returns: 'https://example.com'
sanitizeUrl('javascript:alert(1)');     // Returns: ''
sanitizeUrl('data:text/html,...');      // Returns: ''
```

### Filename Sanitization

```typescript
import { sanitizeFilename } from 'servcraft/modules/security';

sanitizeFilename('../../../etc/passwd');  // Returns: '______etc_passwd'
sanitizeFilename('my file (1).pdf');      // Returns: 'my_file__1_.pdf'
```

## CSRF Protection

### Setup

```typescript
import { csrfProtection, generateCsrfToken } from 'servcraft/modules/security';

// Generate token for a session
app.get('/csrf-token', async (request, reply) => {
  const sessionId = request.headers['x-session-id'] || request.ip;
  const token = generateCsrfToken(sessionId);
  return { csrfToken: token };
});

// Protect routes (skip for API with JWT)
app.addHook('preHandler', csrfProtection());
```

### Client Usage

```javascript
// Get CSRF token
const { csrfToken } = await fetch('/csrf-token').then(r => r.json());

// Include in subsequent requests
fetch('/api/action', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify(data),
});
```

## Security Headers

The following headers are automatically added:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer info |
| `Permissions-Policy` | `camera=(), microphone=()...` | Disable dangerous features |
| `Cache-Control` | `no-store` | Prevent caching sensitive data |

## HTTP Parameter Pollution Protection

```typescript
import { hppProtection } from 'servcraft/modules/security';

// Prevent array injection
// ?user=admin&user=hacker → user=hacker (takes last value)
app.addHook('preHandler', hppProtection());

// Allow specific parameters to be arrays
app.addHook('preHandler', hppProtection(['tags', 'categories']));
// ?tags=a&tags=b → tags=['a', 'b'] (allowed)
```

## Suspicious Activity Detection

```typescript
import { suspiciousActivityDetection } from 'servcraft/modules/security';

// Log suspicious patterns (default)
app.addHook('preHandler', suspiciousActivityDetection());

// Block suspicious requests
app.addHook('preHandler', suspiciousActivityDetection({
  blockSuspicious: true,
}));
```

### Detected Patterns

- Path traversal: `../`
- Script injection: `<script`
- SQL injection: `UNION SELECT`, `DROP TABLE`
- Template injection: `${}`, `{{}}`
- Code execution: `exec()`, `eval()`

## Security Audit Service

### Logging Security Events

```typescript
import { getSecurityAuditService } from 'servcraft/modules/security';

const audit = getSecurityAuditService();

// Log login success
await audit.logLoginSuccess(userId, request);

// Log login failure
await audit.logLoginFailed(email, 'Invalid password', request);

// Log suspicious activity
await audit.logSuspiciousActivity('Multiple failed login attempts', request, {
  attempts: 5,
  targetEmail: 'user@example.com',
});

// Log rate limit exceeded
await audit.logRateLimitExceeded(request, 100);

// Log brute force detection
await audit.logBruteForceDetected(request, 10, '/api/login');

// Log access denied
await audit.logAccessDenied(userId, 'admin-panel', 'view', request);

// Log admin action
await audit.logAdminAction(adminId, 'delete_user', 'users', {
  targetUserId: deletedUserId,
}, request);
```

### Custom Event Logging

```typescript
await audit.log({
  type: 'auth.mfa.enabled',
  userId: user.id,
  request,
  details: { method: 'totp' },
  success: true,
});
```

### Event Types

| Type | Severity | Description |
|------|----------|-------------|
| `auth.login.success` | low | Successful login |
| `auth.login.failed` | medium | Failed login attempt |
| `auth.mfa.enabled` | medium | MFA enabled |
| `auth.mfa.disabled` | high | MFA disabled |
| `suspicious.activity` | high | Suspicious pattern detected |
| `csrf.violation` | high | CSRF token mismatch |
| `xss.attempt` | critical | XSS attack detected |
| `sqli.attempt` | critical | SQL injection detected |
| `brute.force.detected` | high | Brute force attack |
| `rate.limit.exceeded` | medium | Rate limit hit |
| `data.deletion` | critical | Data deletion |
| `admin.action` | high | Admin action performed |

### Retrieving Security Data

```typescript
const audit = getSecurityAuditService();

// Get recent high/critical alerts
const alerts = await audit.getRecentAlerts(50);

// Get security events for a user
const userEvents = await audit.getUserEvents(userId, 100);

// Get security statistics
const stats = await audit.getStats(24); // Last 24 hours
// {
//   totalEvents: 1250,
//   failedLogins: 45,
//   suspiciousActivities: 12,
//   rateLimitExceeded: 230,
//   criticalAlerts: 3,
// }
```

## Storage

Security audit events are stored in:

1. **Redis** (real-time, 24h TTL) - For monitoring dashboards
2. **PostgreSQL** (long-term) - For compliance and audit trails

### Redis Keys

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `security:audit:{id}` | 24h | Individual events |
| `security:alerts:recent` | - | Recent high/critical alerts list |

## Best Practices

1. **Always sanitize user input** before storing or displaying
2. **Enable CSRF protection** for browser-based apps
3. **Monitor security events** regularly
4. **Set up alerts** for critical severity events
5. **Review audit logs** for compliance requirements
6. **Use rate limiting** in conjunction with brute force detection

## Integration with Other Modules

```typescript
// With Rate Limiting
import { createRateLimiter } from 'servcraft/modules/rate-limit';

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  onLimitReached: async (request) => {
    await audit.logBruteForceDetected(request, 5, '/api/login');
  },
});

// With Auth Module
import { authService } from 'servcraft/modules/auth';

authService.on('login:success', async (user, request) => {
  await audit.logLoginSuccess(user.id, request);
});

authService.on('login:failed', async (email, reason, request) => {
  await audit.logLoginFailed(email, reason, request);
});
```
