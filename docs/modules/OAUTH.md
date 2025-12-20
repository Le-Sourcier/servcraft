# OAuth Module

Social authentication with multiple providers (Google, Facebook, GitHub).

## Features

- **Multiple Providers** - Google, Facebook, GitHub out of the box
- **PKCE Support** - Secure authorization code flow
- **Account Linking** - Link multiple OAuth accounts to one user
- **Token Management** - Automatic token refresh
- **State Protection** - CSRF protection with Redis-stored states

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      OAuth Service                          │
├─────────────────────────────────────────────────────────────┤
│  Google Provider  │  Facebook Provider  │  GitHub Provider  │
└────────┬──────────┴─────────┬───────────┴────────┬──────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                        Repository                           │
├─────────────────────────────────────────────────────────────┤
│      Redis (States)       │      Prisma (Linked Accounts)   │
└───────────────────────────┴─────────────────────────────────┘
```

## Storage

| Data | Storage | TTL |
|------|---------|-----|
| OAuth States | Redis | 10 minutes |
| Linked Accounts | PostgreSQL | Permanent |
| Access Tokens | PostgreSQL | Per provider |
| Refresh Tokens | PostgreSQL | Permanent |

## Usage

### Configuration

```typescript
import { createOAuthService } from 'servcraft/modules/oauth';

const oauthService = createOAuthService({
  callbackBaseUrl: 'https://myapp.com/auth',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    scopes: ['openid', 'email', 'profile'],
  },
  facebook: {
    clientId: process.env.FACEBOOK_APP_ID!,
    clientSecret: process.env.FACEBOOK_APP_SECRET!,
    scopes: ['email', 'public_profile'],
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    scopes: ['user:email', 'read:user'],
  },
});
```

### OAuth Flow

```typescript
// 1. Generate authorization URL
const { url, state } = await oauthService.getAuthorizationUrl('google');
// Redirect user to url

// 2. Handle callback (after user authorizes)
const oauthUser = await oauthService.handleCallback('google', code, state);
// oauthUser: { provider, providerAccountId, email, name, picture, accessToken }

// 3. Find or create user
let userId = await oauthService.findUserByOAuth('google', oauthUser.providerAccountId);

if (!userId) {
  // Create new user
  const user = await userService.create({ email: oauthUser.email, name: oauthUser.name });
  userId = user.id;
}

// 4. Link OAuth account to user
await oauthService.linkAccount(userId, oauthUser);

// 5. Generate session/JWT for user
const tokens = await authService.generateTokens(userId);
```

### Account Management

```typescript
// Get user's linked accounts
const accounts = await oauthService.getUserLinkedAccounts(userId);
// [{ provider: 'google', email: '...', picture: '...' }, ...]

// Check if provider is linked
const googleAccount = accounts.find(a => a.provider === 'google');

// Unlink account
await oauthService.unlinkAccount(userId, 'facebook');

// Refresh tokens (for API access)
const refreshed = await oauthService.refreshTokens(linkedAccountId);
```

### Provider Utilities

```typescript
// Get supported providers
const providers = oauthService.getSupportedProviders();
// ['google', 'facebook', 'github']

// Check if provider is enabled
if (oauthService.isProviderEnabled('google')) {
  // Show Google login button
}
```

## Configuration Types

```typescript
interface OAuthConfig {
  callbackBaseUrl: string;
  google?: {
    clientId: string;
    clientSecret: string;
    scopes?: string[];
  };
  facebook?: {
    clientId: string;
    clientSecret: string;
    scopes?: string[];
  };
  github?: {
    clientId: string;
    clientSecret: string;
    scopes?: string[];
  };
}

interface OAuthUser {
  provider: OAuthProvider;
  providerAccountId: string;
  email?: string;
  name?: string;
  picture?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

interface LinkedAccount {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  email?: string;
  name?: string;
  picture?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Fastify Routes Example

```typescript
// GET /auth/google
fastify.get('/auth/google', async (request, reply) => {
  const { url, state } = await oauthService.getAuthorizationUrl('google');
  reply.redirect(url);
});

// GET /auth/google/callback
fastify.get('/auth/google/callback', async (request, reply) => {
  const { code, state } = request.query as { code: string; state: string };

  try {
    const oauthUser = await oauthService.handleCallback('google', code, state);

    // Find or create user
    let userId = await oauthService.findUserByOAuth('google', oauthUser.providerAccountId);

    if (!userId) {
      const user = await userService.create({
        email: oauthUser.email!,
        name: oauthUser.name,
        emailVerified: true, // OAuth emails are verified
      });
      userId = user.id;
    }

    await oauthService.linkAccount(userId, oauthUser);

    const tokens = await authService.generateTokens(userId);
    reply.redirect(`/dashboard?token=${tokens.accessToken}`);
  } catch (error) {
    reply.redirect('/login?error=oauth_failed');
  }
});
```

## Redis Key Structure

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `oauth:state:{state}` | CSRF state with PKCE verifier | 10 min |

## Security Considerations

1. **State Validation** - Always validate state parameter to prevent CSRF
2. **PKCE** - Use PKCE for public clients (mobile, SPA)
3. **Token Storage** - Store tokens encrypted in database
4. **Scope Minimization** - Request only necessary scopes
5. **Token Refresh** - Implement automatic token refresh for long-lived access

## Error Handling

```typescript
try {
  await oauthService.handleCallback('google', code, state);
} catch (error) {
  if (error.message === 'Invalid or expired OAuth state') {
    // User took too long or CSRF attack
  }
  if (error.message === 'This account is already linked to another user') {
    // OAuth account already linked
  }
}
```
