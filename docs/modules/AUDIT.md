# Audit Module

Audit logging for tracking user actions and system events.

## Features

- **Automatic Logging** - Track CRUD operations automatically
- **User Attribution** - Link actions to users
- **Resource Tracking** - Track changes by resource type
- **IP & User Agent** - Capture request metadata
- **Data Retention** - Configurable log retention

## Usage

### Basic Setup

```typescript
import { getAuditService } from 'servcraft/modules/audit';

const auditService = getAuditService();
```

### Logging Actions

```typescript
// Generic log entry
await auditService.log({
  action: 'create',
  resource: 'order',
  resourceId: 'order-123',
  userId: 'user-456',
  newValue: { total: 99.99, items: 3 },
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
});

// Shortcut methods
await auditService.logCreate('order', 'order-123', 'user-456', { total: 99.99 });

await auditService.logUpdate('order', 'order-123', 'user-456',
  { status: 'pending' },  // old value
  { status: 'shipped' }   // new value
);

await auditService.logDelete('order', 'order-123', 'user-456', { total: 99.99 });
```

### Auth Events

```typescript
// Login event
await auditService.logLogin('user-123', {
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
});

// Logout event
await auditService.logLogout('user-123');

// Password change
await auditService.logPasswordChange('user-123', {
  ipAddress: '192.168.1.1',
});
```

### Querying Logs

```typescript
// Query with filters
const result = await auditService.query({
  userId: 'user-123',
  action: 'update',
  resource: 'order',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  page: 1,
  limit: 50,
});
// { data: [...], total: 150, page: 1, totalPages: 3 }

// Find by user
const userLogs = await auditService.findByUser('user-123', 100);

// Find by resource
const orderLogs = await auditService.findByResource('order', 'order-123', 50);
```

### Data Retention

```typescript
// Delete logs older than 90 days
const deleted = await auditService.cleanupOldLogs(90);
console.log(`Deleted ${deleted} old audit logs`);
```

## Types

```typescript
interface AuditLogEntry {
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogQuery {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

interface AuditLogRecord extends AuditLogEntry {
  id: string;
  timestamp: Date;
}
```

## Common Actions

| Action | Description |
|--------|-------------|
| `create` | Resource created |
| `update` | Resource updated |
| `delete` | Resource deleted |
| `login` | User logged in |
| `logout` | User logged out |
| `password_change` | Password changed |
| `permission_change` | Permissions modified |
| `export` | Data exported |
| `import` | Data imported |

## Middleware Integration

```typescript
// Fastify hook for automatic audit logging
fastify.addHook('onResponse', async (request, reply) => {
  // Only log mutations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    return;
  }

  const userId = request.user?.id;
  const resource = request.routerPath.split('/')[2]; // e.g., /api/orders -> orders

  await auditService.log({
    action: request.method.toLowerCase(),
    resource,
    resourceId: request.params?.id,
    userId,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  });
});
```

## Database Schema

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  user_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
```

## Best Practices

1. **Log Sensitive Actions** - Always log auth, permission, and data changes
2. **Don't Log Sensitive Data** - Exclude passwords, tokens from logs
3. **Retention Policy** - Implement data retention per compliance requirements
4. **Async Logging** - Use async logging to not block requests
5. **Structured Data** - Use consistent action and resource names
