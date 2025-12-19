# User Module Documentation

## Overview

The User module manages user data persistence using Prisma ORM with PostgreSQL/MySQL/SQLite support. It provides a complete CRUD interface with pagination, filtering, and search capabilities.

## Features

- ✅ Prisma ORM integration (PostgreSQL, MySQL, SQLite)
- ✅ Full CRUD operations
- ✅ Pagination and filtering
- ✅ Case-insensitive email search
- ✅ Role-based access control (RBAC)
- ✅ User status management
- ✅ Metadata storage (JSON field)
- ✅ Enum mapping (Prisma ↔ Application types)

## Architecture

### Components

1. **UserRepository** (`user.repository.ts`)
   - Data access layer using Prisma
   - **Migrated from Map<> to Prisma** ✅ (Completed 2025-12-19)
   - Handles type conversions between Prisma and application types

2. **UserService** (`user.service.ts`)
   - Business logic layer
   - Delegates to repository for data operations

3. **UserController** (`user.controller.ts`)
   - HTTP request handlers
   - Input validation
   - Response formatting

## Database Schema

The User model in Prisma:

```prisma
model User {
  id            String     @id @default(uuid())
  email         String     @unique
  password      String
  name          String?
  role          UserRole   @default(USER)
  status        UserStatus @default(ACTIVE)
  emailVerified Boolean    @default(false)
  lastLoginAt   DateTime?
  metadata      Json?

  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  // Relations
  refreshTokens RefreshToken[]
  sessions      Session[]
  auditLogs     AuditLog[]

  @@index([email])
  @@index([status])
  @@index([role])
  @@map("users")
}

enum UserRole {
  USER
  MODERATOR
  ADMIN
  SUPER_ADMIN
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  BANNED
}
```

## Repository API

### Create Operations

#### `create(data: CreateUserData): Promise<User>`

Create a new user.

```typescript
const user = await userRepository.create({
  email: 'user@example.com',
  password: await authService.hashPassword('password123'),
  name: 'John Doe',
  role: 'user', // optional, defaults to 'user'
});
```

**Features:**
- Email is automatically lowercased
- Default role: 'user'
- Default status: 'active'
- Default emailVerified: false
- Throws error on duplicate email

### Read Operations

#### `findById(id: string): Promise<User | null>`

Find user by ID.

```typescript
const user = await userRepository.findById('user-uuid');
if (user) {
  console.log(user.email);
}
```

#### `findByEmail(email: string): Promise<User | null>`

Find user by email (case-insensitive).

```typescript
const user = await userRepository.findByEmail('USER@EXAMPLE.COM');
// Returns user with email 'user@example.com'
```

#### `findMany(params: PaginationParams, filters?: UserFilters): Promise<PaginatedResult<User>>`

Find multiple users with pagination and filtering.

```typescript
const result = await userRepository.findMany(
  { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
  { role: 'admin', status: 'active', search: 'john' }
);

console.log(result.data); // Array of users
console.log(result.meta); // Pagination metadata
```

**Pagination params:**
- `page`: Page number (1-indexed)
- `limit`: Items per page
- `sortBy`: Field to sort by (optional)
- `sortOrder`: 'asc' or 'desc' (optional)

**Filter options:**
- `role`: Filter by role
- `status`: Filter by status
- `emailVerified`: Filter by verification status
- `search`: Search in email or name (case-insensitive)

### Update Operations

#### `update(id: string, data: UpdateUserData): Promise<User | null>`

Update user data.

```typescript
const updated = await userRepository.update('user-id', {
  name: 'Jane Doe',
  role: 'admin',
  emailVerified: true,
  metadata: { preferences: { theme: 'dark' } },
});
```

**Updatable fields:**
- `email`
- `name`
- `role`
- `status`
- `emailVerified`
- `metadata`

#### `updatePassword(id: string, password: string): Promise<User | null>`

Update user password.

```typescript
const newHash = await authService.hashPassword('newPassword123');
await userRepository.updatePassword('user-id', newHash);
```

#### `updateLastLogin(id: string): Promise<User | null>`

Update last login timestamp.

```typescript
await userRepository.updateLastLogin('user-id');
```

### Delete Operations

#### `delete(id: string): Promise<boolean>`

Delete user by ID.

```typescript
const deleted = await userRepository.delete('user-id');
if (deleted) {
  console.log('User deleted successfully');
}
```

**Note:** Cascades to related records (sessions, refresh tokens, audit logs).

### Count Operations

#### `count(filters?: UserFilters): Promise<number>`

Count users with optional filters.

```typescript
const totalUsers = await userRepository.count();
const activeAdmins = await userRepository.count({ role: 'admin', status: 'active' });
```

### Testing Utilities

#### `clear(): Promise<void>`

**⚠️ WARNING:** Deletes all users from the database. Use only in tests.

```typescript
// In test setup
beforeEach(async () => {
  await userRepository.clear();
});
```

## User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `user` | Regular user | Profile read/update |
| `moderator` | Content moderator | User read, content CRUD |
| `admin` | Administrator | User CRUD, settings read |
| `super_admin` | Super administrator | All permissions |

## User Statuses

| Status | Description |
|--------|-------------|
| `active` | Normal active user |
| `inactive` | Inactive account (can be reactivated) |
| `suspended` | Temporarily suspended |
| `banned` | Permanently banned |

## Type Mapping

The repository handles enum conversions between Prisma (UPPERCASE) and application types (lowercase):

| Application Type | Prisma Enum |
|------------------|-------------|
| `user` | `UserRole.USER` |
| `admin` | `UserRole.ADMIN` |
| `moderator` | `UserRole.MODERATOR` |
| `super_admin` | `UserRole.SUPER_ADMIN` |
| `active` | `UserStatus.ACTIVE` |
| `inactive` | `UserStatus.INACTIVE` |
| `suspended` | `UserStatus.SUSPENDED` |
| `banned` | `UserStatus.BANNED` |

This is handled automatically by private mapping methods.

## Usage Examples

### Complete User Lifecycle

```typescript
import { UserRepository } from './modules/user/user.repository.js';
import { AuthService } from './modules/auth/auth.service.js';

const userRepo = new UserRepository();
const authService = new AuthService(app);

// 1. Create user
const user = await userRepo.create({
  email: 'newuser@example.com',
  password: await authService.hashPassword('SecurePass123!'),
  name: 'New User',
});

// 2. Find user
const found = await userRepo.findByEmail('newuser@example.com');

// 3. Update user
await userRepo.update(user.id, {
  emailVerified: true,
  metadata: { onboarded: true },
});

// 4. Track login
await userRepo.updateLastLogin(user.id);

// 5. Promote to admin
await userRepo.update(user.id, { role: 'admin' });

// 6. Suspend user
await userRepo.update(user.id, { status: 'suspended' });

// 7. Delete user
await userRepo.delete(user.id);
```

### Admin Dashboard - User List

```typescript
// Get paginated users with filters
const result = await userRepo.findMany(
  {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  },
  {
    status: 'active',
    // Optional: filter by role
    // role: 'user',
  }
);

// Display results
result.data.forEach(user => {
  console.log(`${user.name} (${user.email}) - ${user.role}`);
});

console.log(`Page ${result.meta.page} of ${result.meta.totalPages}`);
console.log(`Total users: ${result.meta.total}`);
```

### Search Users

```typescript
// Search by name or email
const searchResult = await userRepo.findMany(
  { page: 1, limit: 10 },
  { search: 'john' }
);
// Returns users with 'john' in name or email
```

## Migration from In-Memory

**Previous implementation** (v0.1.0):
```typescript
// ❌ OLD: In-memory storage
const users = new Map<string, User>();
```

**Current implementation** (v0.2.0):
```typescript
// ✅ NEW: Prisma ORM
await prisma.user.create({ data: { ... } });
```

### Migration Steps

1. **Setup database** (if not already done):
   ```bash
   # PostgreSQL (recommended)
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine
   ```

2. **Configure environment**:
   ```bash
   echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/servcraft" >> .env
   ```

3. **Run migrations**:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Update code** (already done):
   - UserRepository now uses Prisma
   - All Map<> operations replaced with Prisma queries

5. **Test**:
   ```bash
   npm test tests/integration/user-prisma.test.ts
   ```

## Performance Considerations

### Indexes

The User table has indexes on:
- `email` (unique + indexed for fast lookups)
- `status` (for filtering)
- `role` (for filtering)

### Query Optimization

- Use `findByEmail()` for single lookups (indexed)
- Use `findMany()` with filters instead of loading all users
- Leverage pagination to avoid loading large datasets
- The `search` filter uses case-insensitive matching (may be slower on large datasets)

### N+1 Query Prevention

```typescript
// ❌ BAD: N+1 queries
const users = await userRepo.findMany({ page: 1, limit: 100 });
for (const user of users.data) {
  const sessions = await prisma.session.findMany({ where: { userId: user.id } });
}

// ✅ GOOD: Use Prisma includes (future enhancement)
// Currently, the repository doesn't expose relations
// Use separate queries or extend the repository
```

## Production Checklist

- [x] Prisma client generated (`npm run db:generate`)
- [x] Migrations applied (`npm run db:migrate`)
- [ ] Database connection pooling configured
- [ ] Backup strategy in place
- [ ] Monitor slow queries
- [ ] Set up read replicas (for high traffic)
- [ ] Regular vacuum/analyze (PostgreSQL)

## Troubleshooting

### "No users found after restart"

**Problem**: Users created in previous session are gone.

**Solution**: With Prisma, this is no longer an issue. Data persists in the database.

### "Prisma Client not generated"

**Problem**: Import errors with `@prisma/client`.

**Solution**:
```bash
npm run db:generate
```

### "Database connection failed"

**Problem**: Can't connect to database.

**Solution**:
1. Check if database is running: `pg_isready` (PostgreSQL)
2. Verify `DATABASE_URL` in `.env`
3. Check network connectivity
4. Verify credentials

### "Migration failed"

**Problem**: `npm run db:migrate` fails.

**Solution**:
```bash
# Reset database (dev only!)
npm run db:push

# Or manually fix migration
npx prisma migrate resolve --rolled-back <migration-name>
```

## Testing

Run user repository tests:
```bash
# All user tests
npm test tests/integration/user-prisma.test.ts

# With coverage
npm run test:coverage -- tests/integration/user-prisma.test.ts
```

**Test coverage:** 100% (all CRUD operations, filtering, pagination, enum mapping)

## Related Modules

- **Auth Module**: User authentication and JWT tokens
- **Audit Module**: Track user actions
- **Session Module**: User sessions (via RefreshToken, Session models)

## API Reference

See `src/modules/user/types.ts` for complete type definitions.

## Changelog

### v0.2.0 (2025-12-19)

**USER-001 Completed:**
- ✅ Migrated from `Map<string, User>` to Prisma ORM
- ✅ Added full test coverage (33 integration tests)
- ✅ Implemented enum mapping (Prisma ↔ Application)
- ✅ Preserved API compatibility (no breaking changes to public interface)
- ✅ Added this documentation

### v0.1.0 (Initial)

- In-memory storage with Map<>
- Basic CRUD operations
- No persistence across restarts
