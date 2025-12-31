"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Lock,
  Shield,
  Key,
  User,
  ChevronRight,
  RefreshCw
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
];

const authConfig = `// src/modules/auth/config.ts
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
  }
};`;

const usageExample = `// src/modules/auth/auth.controller.ts
async register(req, res) {
  const { email, password, name } = req.body;

  const user = await userService.create({
    email,
    password,
    name,
    role: 'USER',
  });

  const tokens = await authService.generateTokens(user);
  res.status(201).json({ user: user.toResponse(), ...tokens });
}`;

export function AuthPage() {
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
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Quick Setup</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {authCommands.map((cmd) => (
              <div key={cmd.cmd} className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
                <Key className="w-5 h-5 text-primary" />
                <code className="font-mono text-sm">{cmd.cmd}</code>
              </div>
            ))}
          </div>

          <CodeBlock
            code="servcraft add auth"
            title="Install Authentication"
          />
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {authFeatures.map((feature) => (
              <div key={feature.title} className="p-6 rounded-xl bg-card border border-border">
                <feature.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Configuration */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Configuration</h2>
          <CodeBlock
            code={authConfig}
            title="src/modules/auth/config.ts"
          />
        </div>
      </section>

      {/* Usage */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Basic Usage</h2>
          <CodeBlock
            code={usageExample}
            title="Auth Controller Example"
          />
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-center">
          <Link href="/docs/api">
            <Button size="lg">View API Reference</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
