"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Settings,
  ChevronRight,
  Terminal,
  FileCode,
  Database,
  Shield,
  Layers,
  Cpu,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Info,
  Copy,
  Code2,
  Lock,
  Zap,
  Server,
  Mail,
  Bell,
  Search
} from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

const configSections = [
  {
    category: "Core",
    icon: Settings,
    description: "Essential project configuration",
    options: [
      { key: "name", type: "string", desc: "Project name used for identification", default: "my-app" },
      { key: "version", type: "string", desc: "Semantic version of your application", default: "1.0.0" },
      { key: "description", type: "string", desc: "Brief description of your project", default: "" },
      { key: "author", type: "string", desc: "Project author or organization", default: "" },
    ],
  },
  {
    category: "ServCraft",
    icon: Zap,
    description: "ServCraft framework settings",
    options: [
      { key: "servcraft.version", type: "string", desc: "Semver constraint for ServCraft version", default: ">=0.4.0" },
      { key: "servcraft.language", type: "enum", desc: "Programming language: typescript or javascript", default: "typescript" },
      { key: "servcraft.moduleSystem", type: "enum", desc: "ESM (ES Modules) or CommonJS", default: "esm", options: ["esm", "cjs"] },
      { key: "servcraft.validator", type: "enum", desc: "Validation library for request schemas", default: "zod", options: ["zod", "joi", "yup"] },
    ],
  },
  {
    category: "Database",
    icon: Database,
    description: "Database connection and ORM settings",
    options: [
      { key: "servcraft.database.provider", type: "enum", desc: "Database engine", default: "postgresql", options: ["postgresql", "mysql", "sqlite", "mongodb"] },
      { key: "servcraft.database.schema", type: "string", desc: "Path to Prisma schema file", default: "prisma/schema.prisma" },
      { key: "servcraft.database.pool.min", type: "number", desc: "Minimum connection pool size", default: "2" },
      { key: "servcraft.database.pool.max", type: "number", desc: "Maximum connection pool size", default: "10" },
    ],
  },
  {
    category: "Authentication",
    icon: Shield,
    description: "Security and authentication settings",
    options: [
      { key: "servcraft.auth.jwt.accessTokenExpiry", type: "string", desc: "Access token lifetime", default: "15m" },
      { key: "servcraft.auth.jwt.refreshTokenExpiry", type: "string", desc: "Refresh token lifetime", default: "7d" },
      { key: "servcraft.auth.jwt.algorithm", type: "string", desc: "JWT signing algorithm", default: "HS256" },
      { key: "servcraft.auth.mfa.enabled", type: "boolean", desc: "Enable two-factor authentication", default: "false" },
      { key: "servcraft.auth.rateLimit.windowMs", type: "number", desc: "Rate limit time window in ms", default: "900000" },
      { key: "servcraft.auth.rateLimit.max", type: "number", desc: "Max requests per window", default: "100" },
    ],
  },
  {
    category: "CORS",
    icon: Globe,
    description: "Cross-Origin Resource Sharing settings",
    options: [
      { key: "servcraft.cors.origin", type: "string", desc: "Allowed origins (comma-separated or * for all)", default: "*" },
      { key: "servcraft.cors.methods", type: "array", desc: "Allowed HTTP methods", default: "['GET','POST','PUT','DELETE','PATCH']" },
      { key: "servcraft.cors.credentials", type: "boolean", desc: "Allow credentials (cookies, auth headers)", default: "true" },
      { key: "servcraft.cors.maxAge", type: "number", desc: "Preflight cache duration in seconds", default: "86400" },
    ],
  },
  {
    category: "Logging",
    icon: Bell,
    description: "Application logging configuration",
    options: [
      { key: "servcraft.logging.level", type: "enum", desc: "Log verbosity level", default: "info", options: ["error", "warn", "info", "debug", "trace"] },
      { key: "servcraft.logging.prettyPrint", type: "boolean", desc: "Colorized output in development", default: "true" },
      { key: "servcraft.logging.timestamp", type: "boolean", desc: "Include timestamps in logs", default: "true" },
    ],
  },
];

const fullConfigExample = `{
  "name": "my-api",
  "version": "1.0.0",
  "description": "Production-ready REST API with ServCraft",
  "author": "Developer <dev@example.com>",

  "servcraft": {
    "version": ">=0.4.0",
    "language": "typescript",
    "modules": ["auth", "users", "email", "cache"],
    "moduleSystem": "esm",

    "database": {
      "provider": "postgresql",
      "schema": "prisma/schema.prisma",
      "pool": {
        "min": 2,
        "max": 10,
        "idleTimeoutMs": 30000,
        "connectionTimeoutMs": 5000
      }
    },

    "auth": {
      "jwt": {
        "accessTokenExpiry": "15m",
        "refreshTokenExpiry": "7d",
        "algorithm": "HS256"
      },
      "mfa": {
        "enabled": true,
        "issuer": "MyApp",
        "window": 1
      },
      "oauth": {
        "providers": ["google", "github", "discord"],
        "callbackUrl": "http://localhost:3000/api/auth/oauth/callback"
      },
      "rateLimit": {
        "windowMs": 900000,
        "max": 100
      }
    },

    "cors": {
      "origin": ["http://localhost:3000", "https://myapp.com"],
      "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      "credentials": true,
      "maxAge": 86400
    },

    "logging": {
      "level": "info",
      "prettyPrint": true,
      "timestamp": true
    },

    "email": {
      "host": "smtp.example.com",
      "port": 587,
      "secure": false,
      "from": "noreply@myapp.com"
    }
  },

  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src/"
  },

  "keywords": ["api", "rest", "servcraft", "fastify", "typescript"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/my-api.git"
  }
}`;

const envExample = `# ===========================================
# Server Configuration
# ===========================================
NODE_ENV=development
PORT=3000
API_PREFIX=/api
API_VERSION=v1

# ===========================================
# Database Configuration
# ===========================================
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# For SQLite (development)
# DATABASE_URL="file:./dev.db"

# For MongoDB
# DATABASE_URL="mongodb://localhost:27017/mydb"

# ===========================================
# JWT Authentication
# ===========================================
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ===========================================
# OAuth Providers (optional)
# ===========================================
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/oauth/callback/google

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/oauth/callback/github

# ===========================================
# Email Configuration (if using email module)
# ===========================================
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@myapp.com

# ===========================================
# Redis Configuration (if using cache module)
# ===========================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ===========================================
# Rate Limiting
# ===========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===========================================
# Security
# ===========================================
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true`;

const configValidationExample = `import { z } from "zod";
import { readFileSync } from "fs";
import { join } from "path";

// Define schema for configuration validation
const configSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\\d+\\.\\d+\\.\\d+$/),
  servcraft: z.object({
    version: z.string(),
    language: z.enum(["typescript", "javascript"]),
    modules: z.array(z.string()),
    database: z.object({
      provider: z.enum(["postgresql", "mysql", "sqlite", "mongodb"]),
      schema: z.string(),
      pool: z.object({
        min: z.number().min(1),
        max: z.number().min(1),
      }).optional(),
    }).optional(),
    auth: z.object({
      jwt: z.object({
        accessTokenExpiry: z.string(),
        refreshTokenExpiry: z.string(),
      }),
    }).optional(),
  }).optional(),
});

// Load and parse config file
function loadConfig() {
  const configPath = join(process.cwd(), "servcraft.config.json");
  const configFile = JSON.parse(readFileSync(configPath, "utf-8"));

  // Validate configuration
  const result = configSchema.safeParse(configFile);

  if (!result.success) {
    console.error("Invalid configuration:");
    result.error.errors.forEach((err) => {
      console.error(\`  \${err.path.join(".")}: \${err.message}\`);
    });
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();`;

const environmentInfo = [
  { icon: CheckCircle2, title: "Development", desc: "Use .env.local for local overrides", color: "text-green-500" },
  { icon: Info, title: "Staging", desc: "Use .env.staging for staging environment", color: "text-yellow-500" },
  { icon: Server, title: "Production", desc: "Use .env.production for production", color: "text-red-500" },
  { icon: AlertTriangle, title: "Security", desc: "Never commit .env files to version control", color: "text-orange-500" },
];

export default function ConfigurationPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-20 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  Project <span className="gradient-text">Configuration</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Configure your ServCraft project for any environment
                </p>
              </div>
            </div>

            <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
              ServCraft uses a centralized configuration file (`servcraft.config.json`) and
              environment variables to manage all project settings. This guide covers all available
              configuration options and best practices.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Configuration Sections */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Configuration <span className="gradient-text">Options</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              All available configuration options organized by category
            </p>
          </motion.div>

          <div className="space-y-8">
            {configSections.map((section, catIndex) => (
              <motion.div
                key={section.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: catIndex * 0.1 }}
                className="p-6 rounded-xl bg-card border border-border"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{section.category}</h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Key</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.options.map((opt) => (
                        <tr key={opt.key} className="border-b border-border/50 last:border-0">
                          <td className="py-3 px-4">
                            <code className="text-primary font-mono text-xs bg-primary/10 px-2 py-1 rounded">
                              {opt.key}
                            </code>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded text-xs font-mono bg-secondary text-secondary-foreground">
                              {opt.type}
                            </span>
                            {opt.options && (
                              <div className="mt-1 flex gap-1 flex-wrap">
                                {opt.options.map((o) => (
                                  <span key={o} className="text-xs text-muted-foreground">{o}</span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{opt.desc}</td>
                          <td className="py-3 px-4">
                            <code className="text-xs font-mono text-foreground/70 bg-secondary/30 px-2 py-1 rounded">
                              {opt.default}
                            </code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Environment Variables */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Environment <span className="gradient-text">Variables</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Store sensitive configuration and environment-specific values securely
            </p>
          </motion.div>

          <div className="mb-8">
            <CodeBlock
              code={envExample}
              title=".env.example"
              showLineNumbers={true}
            />
          </div>

          {/* Environment Info Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {environmentInfo.map((info, index) => (
              <motion.div
                key={info.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg bg-card border border-border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <info.icon className={cn("w-5 h-5", info.color)} />
                  <h3 className="font-semibold">{info.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{info.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Config Validation */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Configuration <span className="gradient-text">Validation</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Validate your configuration at startup to catch errors early
            </p>
          </motion.div>

          <CodeBlock
            code={configValidationExample}
            title="src/utils/config.ts"
            showLineNumbers={true}
          />
        </div>
      </section>

      {/* Complete Configuration Example */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Complete <span className="gradient-text">Example</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A fully configured servcraft.config.json for a production application
            </p>
          </motion.div>

          <CodeBlock
            code={fullConfigExample}
            title="servcraft.config.json"
            showLineNumbers={true}
          />
        </div>
      </section>

      {/* Best Practices */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Best <span className="gradient-text">Practices</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Lock, title: "Keep Secrets Safe", desc: "Never commit secrets to version control. Use environment variables." },
              { icon: CheckCircle2, title: "Validate Early", desc: "Validate configuration at startup to catch errors immediately." },
              { icon: Server, title: "Environment Profiles", desc: "Use different configs for dev, staging, and production." },
              { icon: Copy, title: "Document Defaults", desc: "Use .env.example to document all required variables." },
            ].map((practice, index) => (
              <motion.div
                key={practice.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg bg-card border border-border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <practice.icon className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">{practice.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{practice.desc}</p>
              </motion.div>
            ))}
          </div>
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
              Ready to <span className="gradient-text">Build</span>?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/docs/architecture">
                <Button rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Learn Architecture
                </Button>
              </Link>
              <Link href="/docs/structure">
                <Button variant="outline">View Project Structure</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
