"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Settings,
  Database,
  Shield,
  Zap,
  Lock,
  Server,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Info,
  Terminal,
  Code2,
  Mail,
  HardDrive,
  Cloud,
  Globe2,
  FileText,
  Globe as GlobeIcon,
  Key,
  Clock
} from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/Button";

const configSections = [
  {
    category: "Framework Core",
    icon: Zap,
    description: "Fundamental settings that define how ServCraft operates.",
    options: [
      { key: "servcraft.language", type: "typescript | javascript", desc: "Sets the target language for code generation.", default: "typescript" },
      { key: "servcraft.moduleSystem", type: "esm | cjs", desc: "Determines if your project uses ES Modules (.js) or CommonJS.", default: "esm" },
      { key: "servcraft.validator", type: "zod | joi | yup", desc: "The library used for incoming request validation.", default: "zod" },
      { key: "servcraft.testing", type: "vitest | jest", desc: "Testing framework for unit and integration tests.", default: "vitest" }
    ],
  },
  {
    category: "Database Infrastructure",
    icon: Database,
    description: "Connectivity and schema settings for the data layer.",
    options: [
      { key: "servcraft.database.provider", type: "postgresql | mysql | sqlite | mongodb", desc: "The database engine to use.", default: "postgresql" },
      { key: "servcraft.database.schema", type: "path", desc: "Relative path to your Prisma schema file.", default: "prisma/schema.prisma" },
      { key: "servcraft.database.poolSize", type: "number", desc: "Maximum number of database connections.", default: "10" }
    ],
  },
  {
    category: "Server Configuration",
    icon: Server,
    description: "HTTP server and runtime settings.",
    options: [
      { key: "servcraft.server.port", type: "number", desc: "Port number for the HTTP server.", default: "3000" },
      { key: "servcraft.server.host", type: "string", desc: "Host address to bind to.", default: "0.0.0.0" },
      { key: "servcraft.server.bodyLimit", type: "number", desc: "Maximum request body size in bytes.", default: "1048576" },
      { key: "servcraft.server.trustProxy", type: "boolean", desc: "Trust headers from reverse proxies.", default: "false" }
    ],
  },
];

const envCategories = [
  // Server
  {
    category: "Server",
    variables: [
      { name: "PORT", desc: "The port that Fastify server will listen on.", default: "3000", required: false },
      { name: "NODE_ENV", desc: "Environment: development, testing, or production.", default: "development", required: false },
      { name: "HOST", desc: "Host address to bind to server.", default: "0.0.0.0", required: false },
      { name: "TRUST_PROXY", desc: "Trust X-Forwarded-* headers from reverse proxy.", default: "false", required: false },
    ],
  },
  // Database
  {
    category: "Database",
    variables: [
      { name: "DATABASE_URL", desc: "Connection string for your database.", default: "", required: true },
      { name: "DATABASE_POOL_SIZE", desc: "Maximum number of database connections.", default: "10", required: false },
      { name: "DATABASE_TIMEOUT", desc: "Query timeout in milliseconds.", default: "30000", required: false },
    ],
  },
  // Authentication
  {
    category: "Authentication",
    variables: [
      { name: "JWT_ACCESS_SECRET", desc: "Secret key for signing access tokens.", default: "", required: true },
      { name: "JWT_REFRESH_SECRET", desc: "Secret key for signing refresh tokens.", default: "", required: true },
      { name: "JWT_ACCESS_EXPIRY", desc: "Access token expiration time.", default: "15m", required: false },
      { name: "JWT_REFRESH_EXPIRY", desc: "Refresh token expiration time.", default: "7d", required: false },
      { name: "BCRYPT_ROUNDS", desc: "Number of rounds for password hashing.", default: "12", required: false },
    ],
  },
  // Email
  {
    category: "Email",
    variables: [
      { name: "SMTP_HOST", desc: "SMTP server hostname.", default: "", required: false },
      { name: "SMTP_PORT", desc: "SMTP server port.", default: "587", required: false },
      { name: "SMTP_USER", desc: "SMTP authentication username.", default: "", required: false },
      { name: "SMTP_PASSWORD", desc: "SMTP authentication password.", default: "", required: false },
      { name: "SMTP_FROM", desc: "Default sender email address.", default: "", required: false },
      { name: "SMTP_SECURE", desc: "Use SSL/TLS for SMTP connection.", default: "false", required: false },
    ],
  },
  // Redis/Caching
  {
    category: "Cache",
    variables: [
      { name: "REDIS_URL", desc: "Connection string for Redis.", default: "", required: false },
      { name: "REDIS_MAX_RETRIES", desc: "Maximum reconnection attempts.", default: "3", required: false },
    ],
  },
  // Storage
  {
    category: "Storage",
    variables: [
      { name: "S3_ENDPOINT", desc: "S3-compatible storage endpoint.", default: "", required: false },
      { name: "S3_ACCESS_KEY", desc: "S3 access key ID.", default: "", required: false },
      { name: "S3_SECRET_KEY", desc: "S3 secret access key.", default: "", required: false },
      { name: "S3_BUCKET", desc: "S3 bucket name.", default: "", required: false },
      { name: "S3_REGION", desc: "S3 region.", default: "us-east-1", required: false },
    ],
  },
  // CORS
  {
    category: "CORS",
    variables: [
      { name: "CORS_ORIGIN", desc: "Allowed origins for CORS (comma-separated).", default: "*", required: false },
      { name: "CORS_CREDENTIALS", desc: "Allow cookies in CORS requests.", default: "false", required: false },
      { name: "CORS_METHODS", desc: "Allowed HTTP methods.", default: "GET,POST,PUT,DELETE,PATCH", required: false },
    ],
  },
  // Logging
  {
    category: "Logging",
    variables: [
      { name: "LOG_LEVEL", desc: "Log verbosity: error, warn, info, debug.", default: "info", required: false },
      { name: "LOG_FORMAT", desc: "Log format: json or text.", default: "json", required: false },
    ],
  },
];

const fullConfig = `{
  "name": "my-backend-api",
  "version": "1.0.0",
  "description": "A ServCraft-powered backend API",
  "servcraft": {
    "version": "0.4.9",
    "language": "typescript",
    "moduleSystem": "esm",
    "validator": "zod",
    "testing": "vitest",
    "modules": ["auth", "users", "email", "cache", "storage"],
    "database": {
      "provider": "postgresql",
      "schema": "prisma/schema.prisma",
      "poolSize": 10
    },
    "server": {
      "port": 3000,
      "host": "0.0.0.0",
      "bodyLimit": 1048576,
      "trustProxy": false
    },
    "cors": {
      "origin": "*",
      "credentials": false,
      "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"]
    }
  },
  "dependencies": {
    "fastify": "^4.24.0",
    "@prisma/client": "^5.7.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "prisma": "^5.7.0",
    "vitest": "^1.0.0",
    "typescript": "^5.3.0"
  }
}`;

const databaseConfigExample = `// src/config/database.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Environment-aware logging
if (process.env.NODE_ENV === 'production') {
  // Production: log only errors
  prisma.$connect()
    .then(() => console.log('Database connected'))
    .catch((e) => console.error('Database connection failed:', e));
} else {
  // Development: log all queries
  prisma.$connect();
}

export { prisma };`;

const appConfigExample = `// src/config/app.ts
export const config = {
  // Application metadata
  database: "prisma",
  app: {
    name: process.env.APP_NAME || 'ServCraft API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },

  // Authentication
  auth: {
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET!,
      refreshSecret: process.env.JWT_REFRESH_SECRET!,
      accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
      refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
    }
  },

  // Email configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
      from: process.env.SMTP_FROM,
      secure: process.env.SMTP_SECURE === 'true'
    }
  },

  // Cache configuration
  cache: {
    redis: {
      url: process.env.REDIS_URL,
      maxRetries: Number(process.env.REDIS_MAX_RETRIES) || 3
    }
  },

  // Storage configuration
  storage: {
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      accessKey: process.env.S3_ACCESS_KEY,
      secretKey: process.env.S3_SECRET_KEY,
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION || 'us-east-1'
    }
  }
};`;

const envValidationExample = `// src/config/env.ts
import { z } from 'zod';

// Define schema for environment variables
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'testing', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(10),

  // Authentication
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z.coerce.boolean().default(false),
});

// Validate at startup
export const env = envSchema.parse(process.env);

// Export typed config
export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'testing';`;

const checkRequiredEnvExample = `// src/config/validation.ts
import { config } from './app';

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

export const validateEnv = () => {
  const missing = requiredEnvVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      \`Missing required environment variables: \${missing.join(', ')}\`
    );
  }

  return true;
};`;

export function ConfigurationPage() {
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
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  Project <span className="gradient-text">Configuration</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Fine-tune your ServCraft environment and project settings
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Intro Table */}
      <section className="py-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-white mb-4">Centralized Control</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                ServCraft uses a dual-layer configuration system. Static project settings reside in
                <code className="text-primary mx-1">servcraft.config.json</code>, while environment-specific
                secrets and overrides are handled via <code className="text-primary mx-1">.env</code> files.
                Full TypeScript support with Zod schemas for environment validation.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <p className="text-xs text-amber-200/70 leading-relaxed">
                  <strong>Security Note:</strong> Always add <code className="text-amber-500">.env</code> to your
                  <code className="text-amber-500">.gitignore</code>. Use environment variables in production CI/CD
                  platforms instead of raw files.
                </p>
              </div>
            </div>
            <div className="space-y-4">
               <div className="p-4 rounded-xl bg-card border border-border">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Validation
                  </h4>
                  <p className="text-xs text-muted-foreground">Config is validated at startup to ensure the server starts with correct parameters.</p>
               </div>
               <div className="p-4 rounded-xl bg-card border border-border">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-500" /> Hot Reload
                  </h4>
                  <p className="text-xs text-muted-foreground">Development environment automatically detects changes in your config files.</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* JSON Config Reference */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">JSON Config Reference</h2>
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-12">
              {configSections.map((section) => (
                <div key={section.category}>
                  <div className="flex items-center gap-3 mb-6">
                    <section.icon className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold">{section.category}</h3>
                  </div>
                  <div className="space-y-6">
                    {section.options.map(opt => (
                      <div key={opt.key} className="border-l-2 border-primary/20 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-bold text-primary">{opt.key}</code>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">{opt.type}</span>
                          {opt.default && <span className="text-[10px] text-primary/70">default: {opt.default}</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">{opt.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <CodeBlock
                code={fullConfig}
                title="servcraft.config.json"
                showLineNumbers={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Environment Variables */}
      <section className="py-16 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2">Environment Variables</h2>
            <p className="text-muted-foreground">Standardized variables used by the framework core.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            {envCategories.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center gap-3 mb-6">
                  {cat.category === "Server" && <Server className="w-4 h-4 text-primary" />}
                  {cat.category === "Database" && <Database className="w-4 h-4 text-primary" />}
                  {cat.category === "Authentication" && <Lock className="w-4 h-4 text-primary" />}
                  {cat.category === "Email" && <Mail className="w-4 h-4 text-primary" />}
                  {cat.category === "Cache" && <HardDrive className="w-4 h-4 text-primary" />}
                  {cat.category === "Storage" && <Cloud className="w-4 h-4 text-primary" />}
                  {cat.category === "CORS" && <Globe2 className="w-4 h-4 text-primary" />}
                  {cat.category === "Logging" && <FileText className="w-4 h-4 text-primary" />}
                  <h3 className="text-lg font-bold">{cat.category}</h3>
                </div>
                <div className="space-y-3">
                  {cat.variables.map(v => (
                    <div key={v.name} className="p-4 rounded-xl bg-card border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm font-bold text-white">{v.name}</code>
                        {v.required && <span className="text-[10px] text-red-400 font-bold uppercase">Required</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{v.desc}</p>
                      {v.default && <div className="mt-2 text-[10px] text-primary">Default: {v.default}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Custom Configuration */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Custom Configuration Files</h2>
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
                <Database className="w-5 h-5 text-primary" />
                Database Configuration
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Create a dedicated database configuration file to handle Prisma client initialization,
                connection pooling, and environment-specific logging.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Connection Pooling</h4>
                  <p className="text-xs text-muted-foreground">Configure pool size for production workloads</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Query Logging</h4>
                  <p className="text-xs text-muted-foreground">Enable detailed queries in development</p>
                </div>
              </div>
            </div>
            <CodeBlock
              code={databaseConfigExample}
              title="src/config/database.ts"
              showLineNumbers={true}
            />
          </div>
        </div>
      </section>

      {/* Application Config */}
      <section className="py-16 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <CodeBlock
              code={appConfigExample}
              title="src/config/app.ts"
              showLineNumbers={true}
            />
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                Centralized App Config
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Create a central configuration object that aggregates all settings.
                This provides a single source of truth for your application.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Type Safety</h4>
                  <p className="text-xs text-muted-foreground">Use environment variables to toggle features per environment</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Easy Access</h4>
                  <p className="text-xs text-muted-foreground">Import config from a single location</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Environment Validation */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
                <Key className="w-5 h-5 text-primary" />
                Environment Validation
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Validate all required environment variables at application startup.
                This prevents runtime errors and ensures production readiness.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Early Fail Fast</h4>
                  <p className="text-xs text-muted-foreground">Catch missing env vars before the server starts</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Type Safety</h4>
                  <p className="text-xs text-muted-foreground">Automatic type conversion (e.g., string to number)</p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <CodeBlock
                code={envValidationExample}
                title="env.ts"
                showLineNumbers={true}
              />
              <CodeBlock
                code={checkRequiredEnvExample}
                title="validation.ts"
                showLineNumbers={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 text-center">
        <Link href="/docs/architecture">
          <Button size="lg">Explore Architecture</Button>
        </Link>
      </section>
    </div>
  );
}
