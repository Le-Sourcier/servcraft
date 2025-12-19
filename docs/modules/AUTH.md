# Auth Module Documentation

## Overview

The Auth module provides JWT-based authentication with support for access/refresh tokens, token blacklisting, and user session management.

## Features

- ✅ JWT access and refresh tokens
- ✅ Token blacklisting with Redis (token revocation)
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Role-based access control (RBAC)
- ✅ Token rotation on refresh
- ✅ Graceful fallback to in-memory (development only)

## Architecture

### Components

1. **AuthService** (`auth.service.ts`)
   - Token generation and verification
   - Password hashing and verification
   - **Redis-based token blacklist** ✅ (Updated 2025-12-19)
   - OAuth support methods

2. **AuthController** (`auth.controller.ts`)
   - HTTP endpoints for authentication
   - Request validation
   - Response formatting

3. **AuthMiddleware** (`auth.middleware.ts`)
   - JWT verification middleware
   - Role-based authorization

## Token Blacklist Implementation

### Redis Connection

The AuthService now uses Redis for token blacklisting:

```typescript
const authService = new AuthService(fastifyInstance, 'redis://localhost:6379');
```

**Environment variable:**
```bash
REDIS_URL=redis://localhost:6379
```

### How it works

1. **On Logout**: Token is added to Redis with 7-day TTL
   ```typescript
   await authService.blacklistToken(token);
   ```

2. **On Token Verification**: Checks Redis for blacklisted tokens
   ```typescript
   const isBlacklisted = await authService.isTokenBlacklisted(token);
   ```

3. **Automatic Expiry**: Redis TTL automatically removes expired tokens (7 days)

### Fallback Behavior

If Redis is not available:
- **Blacklisting**: Issues a warning, doesn't store token
- **Verification**: Returns `false` (allows access)
- **Recommendation**: Use Redis in production for security

## API Endpoints

### POST `/auth/register`

Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

### POST `/auth/login`

Authenticate a user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

### POST `/auth/refresh`

Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

**Note:** The old refresh token is automatically blacklisted (token rotation).

### POST `/auth/logout`

Logout and blacklist current token.

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

### GET `/auth/me`

Get current user profile.

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "status": "active",
    "createdAt": "2025-12-19T..."
  }
}
```

### POST `/auth/change-password`

Change user password.

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Request:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

## Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-key-min-32-characters
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis for Token Blacklist
REDIS_URL=redis://localhost:6379
```

### Token Expiration

- **Access Token**: 15 minutes (default)
- **Refresh Token**: 7 days (default)
- **Blacklist TTL**: 7 days (matches refresh token)

## Security Features

### Password Security
- ✅ Bcrypt hashing with 12 rounds
- ✅ Minimum 8 characters (validated)
- ✅ Password complexity (recommended, not enforced)

### Token Security
- ✅ Separate access and refresh tokens
- ✅ Token type verification
- ✅ Token blacklisting on logout
- ✅ Token rotation on refresh
- ✅ Short-lived access tokens

### Session Security
- ✅ Last login tracking
- ✅ Account status check (active/inactive/suspended)
- ✅ Multi-instance support (via Redis)

## Usage Examples

### Basic Authentication Flow

```typescript
// 1. Register
const registerResponse = await fetch('/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'Password123!',
    name: 'John Doe'
  })
});

const { data } = await registerResponse.json();
const { accessToken, refreshToken } = data;

// 2. Use access token
const meResponse = await fetch('/auth/me', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// 3. Refresh token when expired
const refreshResponse = await fetch('/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});

// 4. Logout
await fetch('/auth/logout', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### Using Auth Middleware

```typescript
import { authMiddleware, roleGuard } from './modules/auth';

// Protect route with authentication
fastify.get('/protected', {
  preHandler: authMiddleware
}, async (request, reply) => {
  // Access user: request.user
  reply.send({ user: request.user });
});

// Protect route with role
fastify.get('/admin', {
  preHandler: [authMiddleware, roleGuard(['admin', 'super_admin'])]
}, async (request, reply) => {
  reply.send({ message: 'Admin area' });
});
```

## Production Checklist

- [ ] Set strong `JWT_SECRET` (min 32 characters)
- [ ] Configure `REDIS_URL` for token blacklist
- [ ] Use HTTPS in production
- [ ] Enable rate limiting on auth endpoints
- [ ] Monitor failed login attempts
- [ ] Implement MFA for sensitive accounts
- [ ] Regular security audits
- [ ] Log authentication events (audit trail)

## Troubleshooting

### Token blacklist not working

**Problem**: Revoked tokens still work after logout.

**Solution**: Verify Redis connection:
```bash
redis-cli ping
# Should return: PONG
```

Check logs for Redis connection errors:
```bash
grep "Redis connection error" logs/app.log
```

### Redis connection failed

**Problem**: Auth service can't connect to Redis.

**Solution**:
1. Check if Redis is running: `redis-cli ping`
2. Verify `REDIS_URL` environment variable
3. Check network connectivity
4. Check Redis authentication (if required)

### High Redis memory usage

**Problem**: Too many blacklisted tokens in Redis.

**Solution**: Check blacklist count:
```typescript
const count = await authService.getBlacklistCount();
console.log(`Blacklisted tokens: ${count}`);
```

Redis automatically expires tokens after 7 days (TTL). If memory is still high:
1. Reduce `JWT_REFRESH_EXPIRES_IN`
2. Reduce `BLACKLIST_TTL` in `auth.service.ts`
3. Monitor and clean up manually if needed

## Migration Notes

### v0.1.0 → v0.2.0 (2025-12-19)

**Breaking Change**: Token blacklist now requires Redis.

**Migration steps:**

1. Install and start Redis:
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. Set environment variable:
   ```bash
   echo "REDIS_URL=redis://localhost:6379" >> .env
   ```

3. Update AuthService instantiation to pass Redis URL:
   ```typescript
   // Before
   const authService = new AuthService(fastifyInstance);

   // After (optional, reads from env)
   const authService = new AuthService(fastifyInstance, process.env.REDIS_URL);
   ```

4. Test logout and verify token revocation:
   ```bash
   # Login
   TOKEN=$(curl -X POST /auth/login -d '{"email":"...","password":"..."}' | jq -r '.data.accessToken')

   # Logout
   curl -X POST /auth/logout -H "Authorization: Bearer $TOKEN"

   # Try to use token (should fail)
   curl /auth/me -H "Authorization: Bearer $TOKEN"
   # Expected: 401 Unauthorized
   ```

## Related Modules

- **User Module**: User management and profiles
- **MFA Module**: Two-factor authentication
- **OAuth Module**: Social login providers
- **Audit Module**: Authentication event logging

## References

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Redis Documentation](https://redis.io/docs/)
