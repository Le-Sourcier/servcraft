"use client";

import type { Route } from 'next';
import { motion } from "framer-motion";
import { ZodError } from "zod";
import {
  Terminal,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Package,
  Zap,
  Shield,
  Code2,
  Rocket,
  Layers,
  Lock,
  Terminal as TerminalIcon,
  Search,
  Laptop,
  Box,
  FileCode,
  HardDrive,
  Cloud,
  AlertTriangle,
  Database
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const requirements = [
  { icon: CheckCircle2, text: "Node.js 18+ (LTS recommended)", detail: "Required for core runtime and async local storage support." },
  { icon: CheckCircle2, text: "npm, yarn, or pnpm", detail: "Standard package managers for dependency handling." },
  { icon: Cloud, text: "Docker & Docker Compose", detail: "Used for local database instances and production packaging." },
];

const manualFiles = [
  { file: "package.json", desc: "Core dependencies (Fastify, Prisma, Zod)" },
  { file: "src/server.ts", desc: "Instance initialization and plugin loading" },
  { file: "prisma/schema.prisma", desc: "Data model definition" },
  { file: ".env", desc: "Secrets and connection strings" }
];

export function GettingStartedPage() {
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
                <Rocket className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  Getting <span className="gradient-text">Started</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Comprehensive guide to your first ServCraft backend
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                 <h2 className="text-2xl font-bold mb-4">First Principles</h2>
                 <p className="text-muted-foreground leading-relaxed">
                    ServCraft isn't just about code generation; it's about establishing a **standard of quality**.
                    Whether you use the CLI or set up manually, the goal is the same: **Encapsulated logic**, **Explicit types**, and **Zero global state**.
                 </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <h4 className="text-primary font-bold text-sm mb-1">Scale-First</h4>
                    <p className="text-[10px] text-muted-foreground">Architected to handle 10k+ req/sec out of the box.</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <h4 className="text-primary font-bold text-sm mb-1">DevX</h4>
                    <p className="text-[10px] text-muted-foreground">Type inference that makes documentation redundant.</p>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Environment Setup */}
      <section className="py-20 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4">1. The Environment</h2>
            <p className="text-muted-foreground">Ensure your machine is ready for the workflow.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {requirements.map((req) => (
              <div key={req.text} className="p-6 rounded-3xl bg-card border border-border group hover:border-primary/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <req.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-white mb-2">{req.text}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{req.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Standard Installation (CLI) */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
               <h2 className="text-3xl font-bold mb-6">2. Automated Setup (Recommended)</h2>
               <p className="text-muted-foreground leading-relaxed mb-8">
                  The ServCraft CLI is your best friend. It doesn't just copy files - it analyzes your environment,
                  configures your database provider, and ensures all types are correctly mapped.
               </p>
               <div className="space-y-6">
                  <div className="space-y-2">
                     <h4 className="text-sm font-bold text-white uppercase tracking-widest">Install CLI</h4>
                     <CodeBlock code="npm install -g servcraft" />
                  </div>
                  <div className="space-y-2">
                     <h4 className="text-sm font-bold text-white uppercase tracking-widest">Run Wizard</h4>
                     <CodeBlock code="servcraft init my-api" />
                  </div>
               </div>
            </div>
            <div className="bg-[#0a0a0f] rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <TerminalIcon className="w-64 h-64" />
               </div>
               <h3 className="text-lg font-bold text-white mb-4">What's happening?</h3>
               <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                     <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                     <p className="text-sm text-muted-foreground">Scaffolding logical folder structure following **Module-First** pattern.</p>
                  </li>
                  <li className="flex items-start gap-3">
                     <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                     <p className="text-sm text-muted-foreground">Configuring **Docker Compose** for local PostgreSQL/Redis instances.</p>
                  </li>
                  <li className="flex items-start gap-3">
                     <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                     <p className="text-sm text-muted-foreground">Generating **Prisma Client** types based on your initial models.</p>
                  </li>
               </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Manual Installation Deep Dive */}
      <section className="py-20 bg-secondary/5 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold mb-4">3. Manual Configuration</h2>
              <p className="text-muted-foreground">Want full control? Here is the absolute minimum you need to get a ServCraft-compatible app running.</p>
           </div>

           <div className="grid lg:grid-cols-3 gap-8">
              <div className="space-y-4">
                 {manualFiles.map(f => (
                   <div key={f.file} className="p-4 rounded-xl bg-card border border-border flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                         <FileCode className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                         <div className="text-sm font-mono font-bold text-white">{f.file}</div>
                         <div className="text-[10px] text-muted-foreground">{f.desc}</div>
                      </div>
                   </div>
                 ))}
              </div>
              <div className="lg:col-span-2">
                 <CodeBlock
                   title="Minimum src/server.ts"
                   code={`import { createApp } from 'servcraft-core';
import { authModule } from './modules/auth';

const app = await createApp({
  logger: true,
  modules: [authModule]
});

await app.listen({ port: 3000 });`}
                   showLineNumbers={true}
                 />
              </div>
           </div>

           <div className="mt-16">
              <h3 className="text-2xl font-bold mb-6">Complete Manual Setup</h3>
              <div className="grid lg:grid-cols-2 gap-6">
                 <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Step 1: Initialize Project</h4>
                    <CodeBlock
                       code={`# Create new directory
mkdir my-api && cd my-api

# Initialize Node.js project
npm init -y

# Install core dependencies
npm install fastify @fastify/cors
npm install @prisma/client
npm install zod
npm install pino pino-pretty

# Install dev dependencies
npm install -D typescript @types/node
npm install -D prisma
npm install -D vitest @vitest/ui

# Initialize TypeScript
npx tsc --init`}
                       showLineNumbers={false}
                    />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Step 2: Prisma Schema</h4>
                    <CodeBlock
                       code={`// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`}
                       showLineNumbers={true}
                    />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Step 3: TypeScript Config</h4>
                    <CodeBlock
                       code={`// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`}
                       showLineNumbers={true}
                    />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Step 4: Environment Variables</h4>
                    <CodeBlock
                       code={`# .env
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/mydb?schema=public"

# JWT
JWT_ACCESS_SECRET="your-access-secret-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="7d"

# CORS
CORS_ORIGIN="*"
`}
                       showLineNumbers={true}
                    />
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Docker Compose Setup */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">4. Docker Compose Setup</h2>
            <p className="text-muted-foreground">Spin up a complete development environment with PostgreSQL and Redis in seconds.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-bold mb-4">Docker Compose Configuration</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Create a <code className="text-primary font-mono text-xs">docker-compose.yml</code> file at your project root. This sets up
                PostgreSQL for your database and Redis for caching - two essential services for any modern backend.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Persistent Volumes</h4>
                    <p className="text-xs text-muted-foreground">Database data survives container restarts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Isolated Networks</h4>
                    <p className="text-xs text-muted-foreground">Services communicate securely without exposing ports</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Easy Development</h4>
                    <p className="text-xs text-muted-foreground">One command to start, one to stop everything</p>
                  </div>
                </div>
              </div>
            </div>
            <CodeBlock
              code={`# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    container_name: servcraft-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: servcraft_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: servcraft-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  redis_data:`}
              title="docker-compose.yml"
              showLineNumbers={true}
            />
          </div>

          <div className="mt-16">
            <h3 className="text-xl font-bold mb-6">Docker Commands</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-card border border-border">
                <code className="text-xs font-mono text-primary font-bold mb-2 block">docker-compose up -d</code>
                <p className="text-[10px] text-muted-foreground">Start all services in background</p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border">
                <code className="text-xs font-mono text-primary font-bold mb-2 block">docker-compose down</code>
                <p className="text-[10px] text-muted-foreground">Stop and remove containers</p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border">
                <code className="text-xs font-mono text-primary font-bold mb-2 block">docker-compose logs -f</code>
                <p className="text-[10px] text-muted-foreground">View real-time logs</p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border">
                <code className="text-xs font-mono text-primary font-bold mb-2 block">docker-compose exec postgres psql -U postgres</code>
                <p className="text-[10px] text-muted-foreground">Connect to PostgreSQL shell</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Database Migrations */}
      <section className="py-20 bg-secondary/5 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">5. Database Migrations</h2>
            <p className="text-muted-foreground">Manage your database schema evolution with Prisma migrations - version controlled, reversible, and team-friendly.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            <div>
              <h3 className="text-xl font-bold mb-4">Development Workflow</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                During development, use <code className="text-primary font-mono text-xs">db push</code> for fast iterations.
                It synchronizes your schema with the database without creating migration files.
              </p>
              <CodeBlock
                code={`# Development: Fast sync without migrations
servcraft db push

# Accept data loss warnings (destructive changes)
servcraft db push --accept-data-loss

# Skip Prisma Client regeneration
servcraft db push --skip-generate

# Push with custom schema location
servcraft db push --schema ./prisma/schema.prisma`}
                showLineNumbers={true}
              />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Production Workflow</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                For production and team collaboration, create migration files with <code className="text-primary font-mono text-xs">migrate dev</code>.
                These files track every schema change and can be version controlled.
              </p>
              <CodeBlock
                code={`# Create and apply migration (development)
servcraft db migrate dev

# Name your migration for clarity
servcraft db migrate dev --name add-users-table

# Create migration without applying
servcraft db migrate dev --create-only

# Skip seeding after migration
servcraft db migrate dev --skip-seed

# Generate Prisma Client after schema changes
servcraft db generate`}
                showLineNumbers={true}
              />
            </div>
          </div>

          <div className="mb-16">
            <h3 className="text-xl font-bold mb-6">Migration Best Practices</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <h4 className="font-bold text-white mb-2">Always Review Migrations</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Check generated SQL files before committing. Ensure data loss warnings are acceptable.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                  <Database className="w-5 h-5 text-blue-500" />
                </div>
                <h4 className="font-bold text-white mb-2">Test on Staging First</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Run migrations on staging environment before production to catch issues early.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5 text-orange-500" />
                </div>
                <h4 className="font-bold text-white mb-2">Backup Before Migrations</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Always create database backups before running destructive migrations in production.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-6">Production Deployment</h3>
            <div className="grid lg:grid-cols-2 gap-8">
              <CodeBlock
                code={`# Deploy migrations to production
servcraft db migrate deploy

# Reset database (DANGER - destructive!)
servcraft db reset --force

# Open Prisma Studio for visual browsing
servcraft db studio

# Custom port for Studio
servcraft db studio --port 5555

# Seed database with initial data
servcraft db seed`}
                title="Production migration commands"
                showLineNumbers={true}
              />
              <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20">
                <h4 className="font-bold text-red-400 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Warning: Destructive Operations
                </h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    <span><code className="text-red-400 font-mono text-xs">db reset</code> drops all tables and recreates them - data is lost forever</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    <span><code className="text-red-400 font-mono text-xs">--accept-data-loss</code> allows dropping columns without backup</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    <span>Never run destructive commands in production without backups</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Migration Guide from Other Frameworks */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">6. Migration Guide</h2>
            <p className="text-muted-foreground">Moving from Express, NestJS, or another framework? Here's how to adapt your existing codebase.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="p-6 rounded-3xl bg-card border border-border hover:border-primary/30 transition-all">
              <h3 className="font-bold text-xl mb-4">From Express</h3>
              <p className="text-sm text-muted-foreground mb-4">Replace app.use() with app.register() for middleware. Routes use async/await instead of callbacks.</p>
              <CodeBlock
                code={`// Express
app.get('/users', (req, res) => {
  res.json(users);
});

// ServCraft (Fastify)
app.get('/users', async (request, reply) => {
  return { users };
});`}
                showLineNumbers={false}
              />
            </div>
            <div className="p-6 rounded-3xl bg-card border border-border hover:border-primary/30 transition-all">
              <h3 className="font-bold text-xl mb-4">From NestJS</h3>
              <p className="text-sm text-muted-foreground mb-4">No decorators or class-based controllers. Use simple functions and manual dependency injection.</p>
              <CodeBlock
                code={`// NestJS
@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}

// ServCraft (Fastify)
export const usersRoutes = async (fastify) => {
  fastify.get('/users', async () => {
    return { users: await userService.findAll() };
  });
};`}
                showLineNumbers={false}
              />
            </div>
            <div className="p-6 rounded-3xl bg-card border border-border hover:border-primary/30 transition-all">
              <h3 className="font-bold text-xl mb-4">From Koa</h3>
              <p className="text-sm text-muted-foreground mb-4">Remove async/await middleware chains. Use app.register() with named routes instead.</p>
              <CodeBlock
                code={`// Koa
app.use(async (ctx, next) => {
  ctx.body = 'Hello';
});

// ServCraft (Fastify)
app.get('/', async (request, reply) => {
  return { message: 'Hello' };
});`}
                showLineNumbers={false}
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h3 className="text-xl font-bold mb-4">Key Differences</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-2">No Request/Response Extension</h4>
                  <p className="text-xs text-muted-foreground">
                    In Express you might add properties to req/res. In ServCraft, use the request context via app.decorateRequest().
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-2">Explicit Error Handling</h4>
                  <p className="text-xs text-muted-foreground">
                    Use reply.status().send() for explicit status codes, or throw errors that get caught by your error handler.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-2">Validation First</h4>
                  <p className="text-xs text-muted-foreground">
                    Use Zod schemas on routes with fastify.addSchema() and schema references for reusable validation.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-2">Typed Responses</h4>
                  <p className="text-xs text-muted-foreground">
                    Fastify automatically validates responses against schemas, ensuring API contract compliance.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Common Patterns</h3>
              <CodeBlock
                code={`// Middleware pattern
app.register(async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    // Auth check, logging, etc.
  });
});

// Route with validation
app.get('/users/:id', {
  schema: {
    params: z.object({
      id: z.string().cuid()
    })
  }
}, async (request, reply) => {
  const user = await prisma.user.findUnique({
    where: { id: request.params.id }
  });
  return user;
});

// Error handling
app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation failed',
      issues: error.issues
    });
  }
  reply.status(500).send({ error: 'Internal error' });
});

// Async hooks
app.addHook('preHandler', async (request) => {
  // Run before route handler
});

app.addHook('onSend', async (request, reply, payload) => {
  // Transform response before sending
});`}
                showLineNumbers={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="py-20 bg-secondary/5 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">7. Troubleshooting</h2>
            <p className="text-muted-foreground">Common issues and their solutions when setting up ServCraft.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-card border border-border">
              <h4 className="font-bold text-white mb-3">Port Already in Use</h4>
              <p className="text-xs text-muted-foreground mb-3">Error: <code className="text-red-400 font-mono text-xs">EADDRINUSE: address already in use :::3000</code></p>
              <CodeBlock
                       code={`# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
servcraft dev --port 4000`}
                       showLineNumbers={false}
                    />
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <h4 className="font-bold text-white mb-3">Database Connection Failed</h4>
              <p className="text-xs text-muted-foreground mb-3">Error: <code className="text-red-400 font-mono text-xs">Can't reach database server</code></p>
              <CodeBlock
                       code={`# Check Docker containers are running
docker-compose ps

# Check database logs
docker-compose logs postgres

# Verify DATABASE_URL in .env matches Docker config`}
                       showLineNumbers={false}
                    />
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <h4 className="font-bold text-white mb-3">Prisma Client Not Generated</h4>
              <p className="text-xs text-muted-foreground mb-3">Error: <code className="text-red-400 font-mono text-xs">Cannot find module '@prisma/client'</code></p>
              <CodeBlock
                       code={`# Regenerate Prisma Client
npx prisma generate

# Or with ServCraft CLI
servcraft db generate

# Check Prisma is installed
npm list @prisma/client`}
                       showLineNumbers={false}
                    />
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <h4 className="font-bold text-white mb-3">TypeScript Errors</h4>
              <p className="text-xs text-muted-foreground mb-3">Error: <code className="text-red-400 font-mono text-xs">Cannot find module '@/...'</code></p>
              <CodeBlock code={`// Check tsconfig.json paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

// Clean and reinstall
rm -rf node_modules package-lock.json
npm install`}
                       showLineNumbers={true}
                    />
            </div>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Structure is everything</h2>
          <p className="text-muted-foreground mb-8">Now that your environment is ready, learn how we organize code for maximum performance.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/docs/structure">
              <Button size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
                Explore Structure
              </Button>
            </Link>
            <Link href="/docs/architecture">
              <Button variant="outline" size="lg">Technical Architecture</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
