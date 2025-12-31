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
  Users
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const authFeatures = [
  {
    icon: Key,
    title: "JWT & Session Management",
    description: "Secure cookie-based or header-based JWT authentication with automatic token rotation.",
    points: ["HttpOnly Cookies", "Refresh Token Rotation", "Blacklisting"]
  },
  {
    icon: Shield,
    title: "Role-Based Access (RBAC)",
    description: "Fine-grained permissions and roles that scale with your application needs.",
    points: ["Custom Roles", "Permission Guards", "Resource Ownership"]
  },
  {
    icon: Fingerprint,
    title: "Multi-Factor (MFA)",
    description: "Add an extra layer of security with TOTP (Google Authenticator) and backup codes.",
    points: ["TOTP Support", "Recovery Codes", "QR Generation"]
  },
  {
    icon: Users,
    title: "OAuth 2.0 Providers",
    description: "Integrate social login with Google, GitHub, and more out of the box.",
    points: ["Pre-configured scripts", "Custom callbacks", "Profile sync"]
  },
];

const authConfigSnippet = `// src/modules/auth/config.ts
export const authConfig = {
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET!,
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
    accessTokenExpiry: "15m",
    refreshTokenExpiry: "7d",
  },
  password: {
    bcryptRounds: 12,
    minLength: 8,
    requireSpecial: true,
  },
  mfa: {
    issuer: "ServCraft-App",
  }
};`;

const controllerExample = `// src/modules/auth/auth.controller.ts
import { authService } from './service';

export class AuthController {
  async register(req, res) {
    const user = await authService.register(req.body);
    const tokens = await authService.generateTokens(user.id);

    return res.status(201).send({
      user: user.toPublic(),
      ...tokens
    });
  }

  async login(req, res) {
    const { email, password } = req.body;
    const { user, tokens } = await authService.login(email, password);

    return res.send({ user: user.toPublic(), ...tokens });
  }
}`;

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
                  Enterprise-grade security modules for modern Node.js backends
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
              <h2 className="text-2xl font-bold text-white">Security First approach</h2>
              <p className="text-muted-foreground leading-relaxed">
                Authentication in ServCraft isn't just about logging in. It's a complete ecosystem including
                password hashing (Bcrypt), secure token management, and role-based access control (RBAC)
                to protect every single endpoint.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Bcrypt Hashing</h4>
                    <p className="text-xs text-muted-foreground">Passwords are never stored in plain text.</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Token Rotation</h4>
                    <p className="text-xs text-muted-foreground">Automatic refresh token rotation for max security.</p>
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

      {/* Code sections */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" /> Configuration
              </h3>
              <CodeBlock code={authConfigSnippet} title="config/auth.ts" />
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Code2 className="w-5 h-5 text-primary" /> Implementation
              </h3>
              <CodeBlock code={controllerExample} title="auth.controller.ts" />
            </div>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-primary/5 to-accent/5 border border-white/5">
            <Shield className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Bulletproof your API</h2>
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
