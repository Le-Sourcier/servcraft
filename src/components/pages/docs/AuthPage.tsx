"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Lock,
  Shield,
  Key,
  User,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Fingerprint,
  Users,
  Code2,
  Terminal,
  Clock,
  Globe,
  Smartphone,
  ShieldCheck,
  UserCheck,
  Clock3,
  Ban,
  Eye,
  EyeOff,
  Activity,
  KeyRound,
  LockKeyhole,
  FileKey,
  Link as LinkIcon,
  GitBranch,
  ScanFace,
  AlertCircle,
  Check,
  X,
  Info
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const authFeatures = [
  {
    icon: Key,
    title: "JWT & Session Management",
    description: "Secure cookie-based or header-based JWT authentication with automatic token rotation.",
    points: ["HttpOnly Cookies", "Refresh Token Rotation", "Blacklisting", "Token Invalidation"]
  },
  {
    icon: Shield,
    title: "Role-Based Access (RBAC)",
    description: "Fine-grained permissions and roles that scale with your application needs.",
    points: ["Custom Roles", "Permission Guards", "Resource Ownership", "Dynamic Permissions"]
  },
  {
    icon: Fingerprint,
    title: "Multi-Factor (MFA)",
    description: "Add an extra layer of security with TOTP (Google Authenticator) and backup codes.",
    points: ["TOTP Support", "Recovery Codes", "QR Generation", "Remember Device"]
  },
  {
    icon: Globe,
    title: "OAuth 2.0 Providers",
    description: "Integrate social login with Google, GitHub, and more out of the box.",
    points: ["Pre-configured scripts", "Custom callbacks", "Profile sync", "Multiple providers"]
  },
];

const authConfigSnippet = `// src/modules/auth/config.ts
export const authConfig = {
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET!,
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
    accessTokenExpiry: "15m",           // Short-lived access token
    refreshTokenExpiry: "7d",           // Long-lived refresh token
    issuer: "servcraft-api",
    audience: "servcraft-clients",
  },
  password: {
    bcryptRounds: 12,                   // Secure hashing rounds
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  },
  mfa: {
    issuer: "ServCraft-App",
    qrCodeSize: 200,
    backupCodesCount: 10,
  },
  session: {
    maxAge: 7 * 24 * 60 * 60,           // 7 days in seconds
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
  rateLimit: {
    loginAttempts: 5,
    loginWindowMs: 15 * 60 * 1000,      // 15 minutes
    passwordResetWindowMs: 60 * 60 * 1000, // 1 hour
  },
};`;

const controllerExample = `// src/modules/auth/auth.controller.ts
import { authService } from './service';
import { validate } from '@/middleware/validation';
import { registerSchema, loginSchema } from './schema';

export class AuthController {
  // Register new user
  async register(req, res) {
    const data = req.body;

    const user = await authService.register(data);
    const tokens = await authService.generateTokens(user.id);

    // Set refresh token in HttpOnly cookie
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).send({
      user: user.toPublic(),
      accessToken: tokens.accessToken,
      expiresIn: 900, // 15 minutes
    });
  }

  // Login with email/password
  async login(req, res) {
    const { email, password, deviceInfo } = req.body;

    const { user, tokens } = await authService.login(
      email,
      password,
      deviceInfo
    );

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.send({
      user: user.toPublic(),
      accessToken: tokens.accessToken,
      expiresIn: 900,
    });
  }

  // Refresh access token
  async refresh(req, res) {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      throw new Error('No refresh token provided');
    }

    const tokens = await authService.refreshTokens(refreshToken);

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.send({
      accessToken: tokens.accessToken,
      expiresIn: 900,
    });
  }

  // Logout - invalidate refresh token
  async logout(req, res) {
    const refreshToken = req.cookies.refresh_token;

    if (refreshToken) {
      await authService.logout(refreshToken);
      res.clearCookie('refresh_token');
    }

    return res.send({ message: 'Logged out successfully' });
  }
}`;

const rbacExample = `// src/modules/auth/rbac.ts
import { prisma } from '@/lib/prisma';

// Permission enum
export enum Permission {
  // User management
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',

  // Post management
  POST_READ = 'post:read',
  POST_WRITE = 'post:write',
  POST_DELETE = 'post:delete',
  POST_PUBLISH = 'post:publish',

  // Admin only
  ADMIN_PANEL = 'admin:panel',
  MANAGE_ROLES = 'admin:manage_roles',
}

// Role to permission mapping
const rolePermissions: Record<string, Permission[]> = {
  GUEST: [Permission.POST_READ, Permission.USER_READ],
  USER: [
    Permission.USER_READ,
    Permission.POST_READ,
    Permission.POST_WRITE,
    Permission.POST_DELETE,
  ],
  MODERATOR: [
    Permission.USER_READ,
    Permission.POST_READ,
    Permission.POST_WRITE,
    Permission.POST_DELETE,
    Permission.POST_PUBLISH,
  ],
  ADMIN: Object.values(Permission), // All permissions
};

// Check if user has permission
export function hasPermission(userRole: string, permission: Permission): boolean {
  const permissions = rolePermissions[userRole] || [];
  return permissions.includes(permission);
}

// Check multiple permissions (AND logic)
export function hasAllPermissions(userRole: string, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(userRole, p));
}

// Check any permission (OR logic)
export function hasAnyPermission(userRole: string, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(userRole, p));
}

// Fastify hook for route protection
export const requirePermission = (permission: Permission) => async (req, res) => {
  const user = req.user; // Set by auth middleware

  if (!user) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  if (!hasPermission(user.role, permission)) {
    return res.status(403).send({ error: 'Forbidden' });
  }

  // User has permission, continue to handler
};

// Resource ownership check (e.g., user can only delete their own posts)
export const requireOwnership = (resourceField: string = 'userId') => async (req, res) => {
  const user = req.user;
  const resourceId = req.params.id;

  const resource = await prisma.post.findUnique({
    where: { id: resourceId },
    select: { [resourceField]: true },
  });

  if (!resource) {
    return res.status(404).send({ error: 'Resource not found' });
  }

  if (resource[resourceField] !== user.id && user.role !== 'ADMIN') {
    return res.status(403).send({ error: 'Access denied' });
  }
};

// Usage in routes
app.route({
  method: 'DELETE',
  url: '/posts/:id',
  preHandler: [
    authenticate,
    requirePermission(Permission.POST_DELETE),
    requireOwnership(),
  ],
  handler: deletePostHandler,
});`;

const mfaExample = `// src/modules/auth/mfa.ts
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export class MFAService {
  // Generate secret for user
  async generateSecret(userId: string, email: string) {
    const secret = authenticator.generateSecret();

    // Save secret to database
    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    // Generate QR code
    const issuer = 'ServCraft-App';
    const otpauth = authenticator.keyuri(email, issuer, secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    return {
      secret,
      qrCodeUrl,
    };
  }

  // Verify TOTP token
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true },
    });

    if (!user?.mfaSecret) {
      throw new Error('MFA not enabled for this user');
    }

    return authenticator.verify({
      token,
      secret: user.mfaSecret,
    });
  }

  // Enable MFA for user
  async enableMFA(userId: string, token: string) {
    const isValid = await this.verifyToken(userId, token);

    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);

    // Hash backup codes and save
    const hashedCodes = backupCodes.map(code =>
      hashPassword(code)
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        backupCodes: hashedCodes,
      },
    });

    return { backupCodes }; // Return only once to user
  }

  // Verify backup code
  async useBackupCode(userId: string, code: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { backupCodes: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Find matching backup code
    const codeIndex = user.backupCodes.findIndex(bc =>
      bcrypt.compare(code, bc)
    );

    if (codeIndex === -1) {
      throw new Error('Invalid backup code');
    }

    // Remove used code
    const newBackupCodes = user.backupCodes.filter((_, i) => i !== codeIndex);

    await prisma.user.update({
      where: { id: userId },
      data: { backupCodes: newBackupCodes },
    });

    return { remainingCodes: newBackupCodes.length };
  }

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(
        Array(8)
          .fill(0)
          .map(() => Math.floor(Math.random() * 10))
          .join('')
      );
    }
    return codes;
  }
}`;

const oauthExample = `// src/modules/auth/oauth.ts
import { OAuth2Client } from 'google-auth-library';
import { Octokit } from 'octokit';

export class OAuthService {
  // Google OAuth
  async verifyGoogleToken(idToken: string) {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid Google token');
    }

    return {
      provider: 'google',
      email: payload.email!,
      name: payload.name,
      picture: payload.picture,
      sub: payload.sub,
    };
  }

  // GitHub OAuth
  async verifyGitHubToken(code: string) {
    const octokit = new Octokit({
      auth: process.env.GITHUB_CLIENT_SECRET,
    });

    // Exchange code for access token
    const { data: tokenData } = await octokit.request(
      'POST /login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }
    );

    // Get user info
    const { data: user } = await octokit.request('GET /user', {
      headers: {
        Authorization: \`Bearer \${tokenData.access_token}\`,
      },
    });

    return {
      provider: 'github',
      email: user.email,
      name: user.name || user.login,
      picture: user.avatar_url,
      sub: user.id.toString(),
    };
  }

  // Find or create user from OAuth
  async findOrCreateOAuthUser(oauthData: any) {
    // First try to find by email
    let user = await prisma.user.findUnique({
      where: { email: oauthData.email },
    });

    if (user) {
      // Link OAuth account if not already linked
      await this.linkOAuthAccount(user.id, oauthData);
      return user;
    }

    // Create new user
    user = await prisma.user.create({
      data: {
        email: oauthData.email,
        name: oauthData.name,
        avatar: oauthData.picture,
        role: 'USER',
        status: 'ACTIVE',
        oauthAccounts: {
          create: {
            provider: oauthData.provider,
            providerId: oauthData.sub,
          },
        },
      },
    });

    return user;
  }

  private async linkOAuthAccount(userId: string, oauthData: any) {
    const exists = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: oauthData.provider,
          providerId: oauthData.sub,
        },
      },
    });

    if (!exists) {
      await prisma.oAuthAccount.create({
        data: {
          userId,
          provider: oauthData.provider,
          providerId: oauthData.sub,
        },
      });
    }
  }
}`;

const tokenLifecycle = `// Refresh Token Lifecycle for Maximum Security

// 1. Initial Login
// =================
Client                    Server                 Database
  |                         |                      |
  |-- POST /login --------->|                      |
  |  {email, password}      |                      |
  |                         |-- verify credentials->|
  |                         |<---------------------|
  |                         |                      |
  |                         |-- generate tokens---->|
  |                         |<---------------------|
  |<-- 200 OK --------------|                      |
  |  {accessToken,         |                      |
  |   user}                |                      |
  |  + Set-Cookie:         |                      |
  |    refresh_token       |                      |
// Refresh token stored in DB with expiration

// 2. Access Token Expiration (15 min)
// ===================================
Client                    Server                 Database
  |                         |                      |
  |-- GET /protected ----->|                      |
  |  Authorization: Bearer |                      |
  |    expired_token        |                      |
  |<-- 401 Unauthorized ----|                      |

// 3. Token Refresh (Automatic)
// ============================
Client                    Server                 Database
  |                         |                      |
  |-- POST /refresh ------->|                      |
  |  Cookie: refresh_token |                      |
  |                         |-- validate token --->|
  |                         |<---------------------|
  |                         |                      |
// Rotation: Generate NEW refresh token
// The old one is immediately invalidated
  |                         |-- rotate token------->|
  |                         |<---------------------|
  |<-- 200 OK --------------|                      |
  |  {accessToken}         |                      |
  |  + Set-Cookie: NEW      |                      |
  |    refresh_token       |                      |
  |                         |-- delete old token -->|
  |<-- Set-Cookie: invalidate |                 |

// 4. Logout
// =========
Client                    Server                 Database
  |                         |                      |
  |-- POST /logout -------->|                      |
  |  Cookie: refresh_token |                      |
  |                         |-- delete token------>|
  |                         |<---------------------|
  |<-- 200 OK --------------|                      |
// Refresh token removed from DB
// Client clears all cookies

// Security Benefits:
// - Short-lived access tokens (15 min)
// - Token rotation prevents replay attacks
// - Old refresh tokens are immediately blacklisted
// - Server-side invalidation support
// - All refresh tokens stored in database for revocation`;

const securityPractices = [
  {
    title: "Token Rotation",
    desc: "Generate a new refresh token on every refresh. Old tokens are immediately invalidated to prevent reuse by attackers.",
    icon: RefreshCw
  },
  {
    title: "HttpOnly Cookies",
    desc: "Refresh tokens stored in HttpOnly cookies are inaccessible to JavaScript, preventing XSS token theft.",
    icon: ShieldCheck
  },
  {
    title: "CSRF Protection",
    desc: "Use SameSite cookies and CSRF tokens to prevent cross-site request forgery attacks.",
    icon: LockKeyhole
  },
  {
    title: "Rate Limiting",
    desc: "Limit login attempts and password reset requests to prevent brute force attacks.",
    icon: Activity
  },
  {
    title: "Secure Headers",
    desc: "Set proper security headers: X-Content-Type-Options, X-Frame-Options, Content-Security-Policy.",
    icon: FileKey
  },
  {
    title: "Input Validation",
    desc: "Validate and sanitize all user inputs to prevent injection attacks.",
    icon: UserCheck
  },
];

export function AuthPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-16 lg:py-24 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  <span className="gradient-text">Authentication</span> & Security
                </h1>
                <p className="text-muted-foreground mt-1">
                  Enterprise-grade security modules with JWT, RBAC, MFA, and OAuth
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Security Architecture */}
      <section className="py-16 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-2xl font-bold text-white">Security First Architecture</h2>
              <p className="text-muted-foreground leading-relaxed">
                Authentication in ServCraft isn't just about logging in. It's a complete ecosystem including
                password hashing (Bcrypt), secure token management, role-based access control (RBAC),
                multi-factor authentication (MFA), and OAuth integration to protect every single endpoint.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Bcrypt Hashing</h4>
                    <p className="text-xs text-muted-foreground">12 rounds of bcrypt for password security</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Token Rotation</h4>
                    <p className="text-xs text-muted-foreground">Automatic refresh token rotation for max security</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">RBAC System</h4>
                    <p className="text-xs text-muted-foreground">Fine-grained role and permission management</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">OAuth Support</h4>
                    <p className="text-xs text-muted-foreground">Google, GitHub, and custom providers</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#0d0d14] p-6 rounded-2xl border border-white/5 shadow-inner">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Quick Setup</h3>
              <div className="space-y-3">
                <code className="block p-3 rounded bg-white/5 text-xs text-foreground font-mono">servcraft add auth</code>
                <code className="block p-3 rounded bg-white/5 text-xs text-foreground font-mono">servcraft add users</code>
                <code className="block p-3 rounded bg-white/5 text-xs text-foreground font-mono">servcraft add mfa</code>
                <code className="block p-3 rounded bg-white/5 text-xs text-foreground font-mono">servcraft add oauth</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {authFeatures.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl bg-card border border-border hover:shadow-xl transition-all">
                <f.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{f.description}</p>
                <div className="space-y-1.5">
                  {f.points.map(p => (
                    <div key={p} className="flex items-center gap-2 text-[10px] text-primary/80 font-medium">
                      <Zap className="w-3 h-3" /> {p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Configuration */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Settings className="w-6 h-6 text-primary" />
                Auth Configuration
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Centralized configuration for JWT settings, password policies, MFA options,
                and rate limiting. All sensitive values use environment variables.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">JWT Tokens</h4>
                  <p className="text-xs text-muted-foreground">Access (15min) + Refresh (7d) with rotation</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Password Policy</h4>
                  <p className="text-xs text-muted-foreground">Bcrypt(12) with complexity requirements</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Rate Limiting</h4>
                  <p className="text-xs text-muted-foreground">5 attempts per 15 minutes window</p>
                </div>
              </div>
            </div>
            <CodeBlock
              code={authConfigSnippet}
              title="config/auth.ts"
              showLineNumbers={true}
            />
          </div>
        </div>
      </section>

      {/* Controller Implementation */}
      <section className="py-16 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <CodeBlock
              code={controllerExample}
              title="auth.controller.ts"
              showLineNumbers={true}
            />
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Terminal className="w-6 h-6 text-primary" />
                Controller Implementation
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                The auth controller handles the complete authentication flow: registration,
                login, token refresh, and logout with proper error handling and security measures.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">Register</h4>
                  <p className="text-xs text-muted-foreground">Create user with secure password hashing</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">Login</h4>
                  <p className="text-xs text-muted-foreground">Verify credentials, issue tokens, set cookies</p>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">Refresh</h4>
                  <p className="text-xs text-muted-foreground">Rotate refresh token, issue new access token</p>
                </div>
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">Logout</h4>
                  <p className="text-xs text-muted-foreground">Invalidate refresh token in database</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RBAC System */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Shield className="w-6 h-6 text-primary" />
                Role-Based Access Control
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                ServCraft provides a flexible RBAC system with permissions and roles.
                Protect routes with fine-grained access control checks.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Predefined Roles</h4>
                  <p className="text-xs text-muted-foreground">GUEST, USER, MODERATOR, ADMIN</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Permission System</h4>
                  <p className="text-xs text-muted-foreground">Granular permissions like user:read, post:publish</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Resource Ownership</h4>
                  <p className="text-xs text-muted-foreground">Users can only access their own resources</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Middleware Hooks</h4>
                  <p className="text-xs text-muted-foreground">Easily protect routes with decorators</p>
                </div>
              </div>
            </div>
            <CodeBlock
              code={rbacExample}
              title="rbac.ts"
              showLineNumbers={true}
            />
          </div>
        </div>
      </section>

      {/* Token Lifecycle */}
      <section className="py-16 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Refresh Token Lifecycle</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Understanding the complete flow of token rotation for maximum security
            </p>
          </div>
          <div className="bg-[#0a0a0f] rounded-3xl p-8 border border-white/5">
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono ml-2 uppercase tracking-widest">token-lifecycle.md</span>
            </div>
            <pre className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{tokenLifecycle}</pre>
          </div>
        </div>
      </section>

      {/* MFA */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <CodeBlock
              code={mfaExample}
              title="mfa.ts - Multi-Factor Authentication"
              showLineNumbers={true}
            />
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Fingerprint className="w-6 h-6 text-primary" />
                Multi-Factor Authentication
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Add an extra layer of security with TOTP (Google Authenticator, Authy).
                Users can also generate backup codes for account recovery.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">TOTP Support</h4>
                  <p className="text-xs text-muted-foreground">Time-based one-time passwords using otplib</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">QR Code Generation</h4>
                  <p className="text-xs text-muted-foreground">Automatic QR code for easy app setup</p>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">Backup Codes</h4>
                  <p className="text-xs text-muted-foreground">10 one-time recovery codes for emergencies</p>
                </div>
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">Remember Device</h4>
                  <p className="text-xs text-muted-foreground">Optional trusted device feature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OAuth */}
      <section className="py-16 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Globe className="w-6 h-6 text-primary" />
                OAuth 2.0 Providers
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Integrate social login with Google, GitHub, and custom OAuth providers.
                The system automatically creates or links user accounts.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Google OAuth</h4>
                  <p className="text-xs text-muted-foreground">Full Google Sign-In integration</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">GitHub OAuth</h4>
                  <p className="text-xs text-muted-foreground">GitHub OAuth app support</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Account Linking</h4>
                  <p className="text-xs text-muted-foreground">Link multiple providers to one account</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Profile Sync</h4>
                  <p className="text-xs text-muted-foreground">Automatic profile data synchronization</p>
                </div>
              </div>
            </div>
            <CodeBlock
              code={oauthExample}
              title="oauth.ts"
              showLineNumbers={true}
            />
          </div>
        </div>
      </section>

      {/* Security Best Practices */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Security Best Practices</h2>
            <p className="text-muted-foreground">Follow these guidelines to keep your authentication system secure</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityPractices.map((practice) => (
              <div key={practice.title} className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all">
                <practice.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="text-sm font-bold text-white mb-2">{practice.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{practice.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-primary/5 to-accent/5 border border-white/5">
            <Shield className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Bulletproof Your API</h2>
            <p className="text-muted-foreground mb-8">
              Explore the full API reference to learn about middleware, guards, and helper functions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/docs/api">
                <Button size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
                  API Reference
                </Button>
              </Link>
              <Link href="/modules">
                <Button variant="outline" size="lg">Explore Modules</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Settings icon component for use in code
function Settings(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
  );
}
