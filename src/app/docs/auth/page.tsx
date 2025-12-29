"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Lock,
  Shield,
  Key,
  User,
  ChevronRight,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const authFeatures = [
  {
    icon: Key,
    title: "JWT Tokens",
    description: "Access and refresh token authentication with secure token management",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description: "RBAC with roles and permissions system for fine-grained access control",
  },
  {
    icon: User,
    title: "User Management",
    description: "Complete user CRUD with profile management and activity tracking",
  },
  {
    icon: RefreshCw,
    title: "MFA Support",
    description: "Two-factor authentication with TOTP apps and backup codes",
  },
  {
    icon: Key,
    title: "OAuth Providers",
    description: "Social login with Google, GitHub, Facebook, Twitter, and Apple",
  },
  {
    icon: Shield,
    title: "Password Security",
    description: "Secure password hashing with bcrypt and password policies",
  },
];

const authCommands = [
  { cmd: "servcraft add auth", desc: "Add authentication module" },
  { cmd: "servcraft add users", desc: "Add user management module" },
  { cmd: "servcraft add mfa", desc: "Add MFA/TOTP module" },
  { cmd: "servcraft add oauth", desc: "Add OAuth providers" },
];

const authConfig = `// src/modules/auth/config.ts
export const authConfig = {
  // JWT Configuration
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET!,
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
    accessTokenExpiry: "15m", // 15 minutes
    refreshTokenExpiry: "7d", // 7 days
  },

  // Password Configuration
  password: {
    bcryptRounds: 12,
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
  },

  // MFA Configuration
  mfa: {
    issuer: "ServCraft",
    window: 1, // Allow 1 step drift
  },

  // Rate Limiting
  rateLimit: {
    login: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 attempts per 15 min
    register: { windowMs: 60 * 60 * 1000, max: 3 }, // 3 per hour
  },
};`;

const usageExample = `// src/modules/auth/auth.service.ts
import { authService } from './service';
import { jwtService } from './jwt';

class AuthController {
  // Register new user
  async register(req, res) {
    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      throw new HttpError(400, 'Email already registered');
    }

    // Create user with hashed password
    const user = await userService.create({
      email,
      password, // Will be hashed automatically
      name,
      role: 'USER',
    });

    // Generate tokens
    const tokens = await authService.generateTokens(user);

    res.status(201).json({
      user: user.toResponse(),
      ...tokens,
    });
  }

  // Login
  async login(req, res) {
    const { email, password } = req.body;

    const user = await userService.findByEmail(email);
    if (!user) {
      throw new HttpError(401, 'Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new HttpError(401, 'Invalid credentials');
    }

    // Generate tokens
    const tokens = await authService.generateTokens(user);

    res.json({
      user: user.toResponse(),
      ...tokens,
    });
  }

  // Refresh token
  async refresh(req, res) {
    const { refreshToken } = req.body;

    const payload = jwtService.verifyRefresh(refreshToken);
    const user = await userService.findById(payload.userId);

    if (!user || user.refreshToken !== refreshToken) {
      throw new HttpError(401, 'Invalid refresh token');
    }

    const tokens = await authService.generateTokens(user);

    res.json(tokens);
  }
}`;

const middlewareExample = `// src/middleware/auth.ts
import { authMiddleware } from '../modules/auth';

// Protect routes - requires valid JWT
app.get('/api/protected',
  authMiddleware,
  (req, res) => {
    // req.user is available here
    const user = req.user;
    res.json({ message: 'Protected data', user });
  }
);

// Role-based access control
app.get('/api/admin',
  authMiddleware,
  authMiddleware.requireRole('ADMIN'),
  (req, res) => {
    res.json({ message: 'Admin data' });
  }
);

// Custom permission check
app.get('/api/dashboard',
  authMiddleware,
  authMiddleware.requirePermission('dashboard:read'),
  (req, res) => {
    res.json({ message: 'Dashboard data' });
  }
);`;

export default function AuthPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-20 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Documentation
            </Link>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  <span className="gradient-text">Authentication</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Implement JWT auth, RBAC, MFA, and OAuth providers
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Install */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Quick <span className="gradient-text">Setup</span>
            </h2>
            <p className="text-muted-foreground">
              Add authentication to your project with a single command
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {authCommands.map((cmd, index) => (
              <motion.div
                key={cmd.cmd}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border"
              >
                <Key className="w-5 h-5 text-primary flex-shrink-0" />
                <code className="font-mono text-sm flex-1">{cmd.cmd}</code>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {cmd.desc}
                </span>
              </motion.div>
            ))}
          </div>

          <CodeBlock
            code="# Complete authentication setup
servcraft add auth
servcraft add users
servcraft add mfa
servcraft add oauth

# Or all at once
servcraft init my-app --add-auth"
            title="Install Authentication"
            showLineNumbers={false}
          />
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              <span className="gradient-text">Authentication</span> Features
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {authFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-xl bg-card border border-border"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Configuration */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Configuration
            </h2>
          </motion.div>

          <CodeBlock
            code={authConfig}
            title="src/modules/auth/config.ts"
          />
        </div>
      </section>

      {/* Usage */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Basic <span className="gradient-text">Usage</span>
            </h2>
          </motion.div>

          <CodeBlock
            code={usageExample}
            title="Auth Controller Example"
          />
        </div>
      </section>

      {/* Middleware */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Protecting <span className="gradient-text">Routes</span>
            </h2>
          </motion.div>

          <CodeBlock
            code={middlewareExample}
            title="Using Auth Middleware"
          />
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Ready to <span className="gradient-text">Explore More</span>?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/docs/api">
                <Button rightIcon={<ChevronRight className="w-4 h-4" />}>
                  API Reference
                </Button>
              </Link>
              <Link href="/docs/database">
                <Button variant="outline">Back to Database</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
