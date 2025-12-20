# Session Module

Server-side session management with Redis storage and optional PostgreSQL persistence.

## Features

- **Redis-based Storage** - Fast session access with configurable TTL
- **Sliding Expiration** - Extend session on activity
- **Multi-device Support** - List and manage user sessions across devices
- **Optional Persistence** - PostgreSQL backup for audit trails
- **Session Metadata** - Store device info, IP, user agent

## Installation

```typescript
import {
  SessionService,
  createSessionService,
  getSessionService,
} from 'servcraft/modules/session';
```

## Quick Start

```typescript
import { getSessionService } from 'servcraft/modules/session';

const sessionService = getSessionService();

// Create a session
const session = await sessionService.create({
  userId: 'user-123',
  metadata: {
    device: 'Chrome on Windows',
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  },
});

// Get session
const currentSession = await sessionService.get(session.id);

// Extend session (sliding expiration)
await sessionService.touch(session.id);

// Destroy session
await sessionService.destroy(session.id);
```

## Configuration

```typescript
import { createSessionService } from 'servcraft/modules/session';

const sessionService = createSessionService({
  // Session TTL in seconds (default: 24 hours)
  ttl: 86400,

  // Enable sliding expiration (default: true)
  slidingExpiration: true,

  // Redis key prefix (default: 'session:')
  prefix: 'session:',

  // Enable PostgreSQL persistence (default: false)
  persistToDatabase: true,
});
```

## API Reference

### Create Session

```typescript
const session = await sessionService.create({
  userId: 'user-123',
  metadata: {
    device: 'Mobile Safari on iOS',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    location: 'Paris, France',
  },
});

// Returns:
// {
//   id: 'sess_abc123...',
//   userId: 'user-123',
//   metadata: { ... },
//   createdAt: Date,
//   expiresAt: Date,
//   lastAccessedAt: Date,
// }
```

### Get Session

```typescript
const session = await sessionService.get('sess_abc123');

if (!session) {
  // Session expired or doesn't exist
  throw new Error('Invalid session');
}
```

### Touch Session (Extend TTL)

```typescript
// Extend session TTL on user activity
const extended = await sessionService.touch('sess_abc123');

if (extended) {
  // Session TTL was reset
}
```

### Destroy Session

```typescript
// Single session (logout)
await sessionService.destroy('sess_abc123');

// All user sessions (logout everywhere)
await sessionService.destroyUserSessions('user-123');
```

### List User Sessions

```typescript
const sessions = await sessionService.getUserSessions('user-123');

// Returns array of active sessions:
// [
//   { id: 'sess_abc', device: 'Chrome', lastAccessedAt: Date, current: true },
//   { id: 'sess_xyz', device: 'Mobile', lastAccessedAt: Date, current: false },
// ]
```

### Session Statistics

```typescript
const stats = await sessionService.getStats();
// {
//   totalSessions: 1523,
//   activeSessions: 342,
//   expiredSessions: 1181,
// }
```

## Middleware Integration

### Fastify Session Middleware

```typescript
import { getSessionService } from 'servcraft/modules/session';

const sessionService = getSessionService();

// Session validation middleware
app.addHook('preHandler', async (request, reply) => {
  const sessionId = request.cookies.sessionId;

  if (!sessionId) {
    return reply.status(401).send({ error: 'No session' });
  }

  const session = await sessionService.get(sessionId);

  if (!session) {
    return reply.status(401).send({ error: 'Invalid session' });
  }

  // Extend session on activity
  await sessionService.touch(sessionId);

  // Attach to request
  request.session = session;
  request.userId = session.userId;
});
```

### Login Handler

```typescript
app.post('/login', async (request, reply) => {
  const { email, password } = request.body;

  // Validate credentials
  const user = await authService.validateCredentials(email, password);

  if (!user) {
    return reply.status(401).send({ error: 'Invalid credentials' });
  }

  // Create session
  const session = await sessionService.create({
    userId: user.id,
    metadata: {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      loginMethod: 'password',
    },
  });

  // Set session cookie
  reply.setCookie('sessionId', session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400, // 24 hours
  });

  return { user, sessionId: session.id };
});
```

### Logout Handler

```typescript
// Logout current session
app.post('/logout', async (request, reply) => {
  const sessionId = request.cookies.sessionId;

  if (sessionId) {
    await sessionService.destroy(sessionId);
  }

  reply.clearCookie('sessionId');
  return { success: true };
});

// Logout all sessions
app.post('/logout-all', async (request, reply) => {
  await sessionService.destroyUserSessions(request.userId);

  reply.clearCookie('sessionId');
  return { success: true };
});
```

## Session Management UI

### List Active Sessions

```typescript
app.get('/sessions', async (request, reply) => {
  const sessions = await sessionService.getUserSessions(request.userId);

  return sessions.map(session => ({
    id: session.id,
    device: session.metadata?.device || 'Unknown',
    ip: session.metadata?.ip,
    location: session.metadata?.location,
    lastActive: session.lastAccessedAt,
    current: session.id === request.cookies.sessionId,
  }));
});
```

### Revoke Specific Session

```typescript
app.delete('/sessions/:sessionId', async (request, reply) => {
  const { sessionId } = request.params;

  // Verify session belongs to user
  const session = await sessionService.get(sessionId);

  if (!session || session.userId !== request.userId) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  await sessionService.destroy(sessionId);
  return { success: true };
});
```

## Storage Architecture

### Redis (Primary)

Sessions are stored in Redis for fast access:

```
session:{sessionId} -> {
  id: string,
  userId: string,
  metadata: object,
  createdAt: timestamp,
  expiresAt: timestamp,
  lastAccessedAt: timestamp,
}
```

TTL is managed automatically. Sessions expire and are removed by Redis.

### PostgreSQL (Optional)

When `persistToDatabase: true`, sessions are also stored in PostgreSQL:

```sql
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_accessed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

This provides:
- Audit trail of all sessions
- Survival across Redis restarts
- Analytics on session patterns

## Security Considerations

1. **Use secure cookies** - `httpOnly`, `secure`, `sameSite`
2. **Rotate session IDs** after sensitive operations
3. **Limit concurrent sessions** per user if needed
4. **Log session events** for security auditing
5. **Implement idle timeout** in addition to absolute timeout

### Session Rotation

```typescript
app.post('/change-password', async (request, reply) => {
  // Change password logic...

  // Destroy all other sessions
  const currentSessionId = request.cookies.sessionId;
  const sessions = await sessionService.getUserSessions(request.userId);

  for (const session of sessions) {
    if (session.id !== currentSessionId) {
      await sessionService.destroy(session.id);
    }
  }

  return { success: true };
});
```

## Integration with Auth Module

```typescript
import { authService } from 'servcraft/modules/auth';
import { getSessionService } from 'servcraft/modules/session';

const sessionService = getSessionService();

// On successful login
authService.on('login:success', async (user, request) => {
  const session = await sessionService.create({
    userId: user.id,
    metadata: {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    },
  });
  return session;
});

// On logout
authService.on('logout', async (sessionId) => {
  await sessionService.destroy(sessionId);
});

// On password change
authService.on('password:changed', async (userId, currentSessionId) => {
  // Destroy all other sessions
  const sessions = await sessionService.getUserSessions(userId);
  for (const session of sessions) {
    if (session.id !== currentSessionId) {
      await sessionService.destroy(session.id);
    }
  }
});
```
