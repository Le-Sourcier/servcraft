"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Database,
  Server,
  RefreshCw,
  ChevronRight,
  Save,
  Trash2,
  Eye,
  Settings,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Terminal,
  Code2,
  Layers
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const databases = [
  {
    name: "PostgreSQL",
    icon: Database,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    description: "Production-ready, highly reliable relational database",
    command: "servcraft init my-app --prisma postgres",
  },
  {
    name: "MySQL",
    icon: Server,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    description: "Popular open-source relational database",
    command: "servcraft init my-app --prisma mysql",
  },
  {
    name: "SQLite",
    icon: Save,
    color: "text-gray-400",
    bg: "bg-gray-400/10",
    description: "Lightweight, file-based database for development",
    command: "servcraft init my-app --prisma sqlite",
  },
  {
    name: "MongoDB",
    icon: Database,
    color: "text-green-400",
    bg: "bg-green-400/10",
    description: "NoSQL document database for flexible schemas",
    command: "servcraft init my-app --prisma mongodb",
  },
];

const dbCommands = [
  {
    command: "servcraft db push",
    description: "Push schema changes to database",
    example: "npm run db:push",
  },
  {
    command: "servcraft db migrate",
    description: "Run Prisma migrations",
    example: "npm run db:migrate",
  },
  {
    command: "servcraft db generate",
    description: "Generate Prisma client",
    example: "npm run db:generate",
  },
  {
    command: "servcraft db seed",
    description: "Run database seeders",
    example: "npm run db:seed",
  },
  {
    command: "servcraft db reset",
    description: "Reset database (dangerous!)",
    example: "npm run db:reset",
  },
  {
    command: "servcraft db studio",
    description: "Open Prisma Studio UI",
    example: "npm run db:studio",
  },
  {
    command: "servcraft db status",
    description: "Show migration status",
    example: "npm run db:status",
  },
];

const prismaSchema = `// prisma/schema.prisma

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
  name      String?
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("posts")
}

enum Role {
  USER
  ADMIN
}`;

const envExample = `# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/servcraft?schema=public"

# For MySQL
# DATABASE_URL="mysql://user:password@localhost:3306/servcraft"

# For SQLite
# DATABASE_URL="file:./dev.db"

# For MongoDB
# DATABASE_URL="mongodb://user:password@localhost:27017/servcraft"`;

const prismaBestPractices = [
  { icon: CheckCircle2, title: "Use migrations for schema changes", desc: "Never edit schema directly in production" },
  { icon: CheckCircle2, title: "Keep models focused", desc: "Each model should have a single responsibility" },
  { icon: CheckCircle2, title: "Use relations wisely", desc: "Define proper foreign keys and indexes" },
  { icon: CheckCircle2, title: "Seed your database", desc: "Use seed files for test data" },
];

const connectionPooling = `// For high-traffic applications, configure connection pooling
// in prisma/schema.prisma:

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

// In your app startup (src/app.ts):
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  __internal: {
    engine: {
      adapter: undefined, // Use adapter for better pooling
    },
  },
});

// Or use PgBouncer for PostgreSQL
// DATABASE_URL="postgresql://.../servcraft?pool_timeout=10&connection_limit=10"`;

const migrationsExample = `// Creating a migration
npm run db:migrate

// This creates files in prisma/migrations/
// 20231201120000_add_user_profile/
//   └── migration.sql

// Sample migration.sql:
-- Add profile fields to User model
ALTER TABLE "users" ADD COLUMN "bio" TEXT;
ALTER TABLE "users" ADD COLUMN "avatar_url" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "updated_at" TIMESTAMP;

-- Create index for faster queries
CREATE INDEX "idx_users_email" ON "users"("email");

// To reset database (development only!)
npm run db:reset

// To view migration status
npm run db:status`;

export default function DatabasePage() {
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
                <Database className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  <span className="gradient-text">Database</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Set up databases, run migrations, and manage your data layer
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Supported Databases */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Supported <span className="gradient-text">Databases</span>
            </h2>
            <p className="text-muted-foreground">
              Choose your preferred database during project initialization
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {databases.map((db, index) => (
              <motion.div
                key={db.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${db.bg} flex items-center justify-center`}>
                    <db.icon className={`w-6 h-6 ${db.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{db.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {db.description}
                    </p>
                    <code className="text-xs font-mono bg-secondary px-2 py-1 rounded block w-fit">
                      {db.command}
                    </code>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Database Commands */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Database <span className="gradient-text">Commands</span>
            </h2>
            <p className="text-muted-foreground">
              Manage your database with these commands
            </p>
          </motion.div>

          <div className="space-y-4">
            {dbCommands.map((cmd, index) => (
              <motion.div
                key={cmd.command}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex flex-col md:flex-row gap-4 p-4 rounded-lg bg-card border border-border items-center"
              >
                <div className="flex items-center gap-3 md:w-64 flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  <code className="font-mono text-sm">{cmd.command}</code>
                </div>
                <div className="flex-1 text-sm text-muted-foreground">
                  {cmd.description}
                </div>
                <div className="md:w-48 flex-shrink-0">
                  <code className="text-xs font-mono bg-secondary px-3 py-1.5 rounded block text-center">
                    {cmd.example}
                  </code>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Prisma Schema */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Prisma <span className="gradient-text">Schema</span>
            </h2>
            <p className="text-muted-foreground">
              Define your database models in Prisma schema
            </p>
          </motion.div>

          <CodeBlock
            code={prismaSchema}
            title="prisma/schema.prisma"
          />
        </div>
      </section>

      {/* Environment Variables */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Environment <span className="gradient-text">Variables</span>
            </h2>
          </motion.div>

          <CodeBlock
            code={envExample}
            title=".env"
          />
        </div>
      </section>

      {/* Best Practices */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Best <span className="gradient-text">Practices</span>
            </h2>
            <p className="text-muted-foreground">
              Follow these guidelines for optimal database usage
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {prismaBestPractices.map((practice, index) => (
              <motion.div
                key={practice.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border"
              >
                <practice.icon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{practice.title}</h3>
                  <p className="text-sm text-muted-foreground">{practice.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Connection Pooling */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Connection <span className="gradient-text">Pooling</span>
            </h2>
            <p className="text-muted-foreground">
              Optimize database connections for high-traffic applications
            </p>
          </motion.div>

          <CodeBlock
            code={connectionPooling}
            title="Connection Pool Configuration"
          />
        </div>
      </section>

      {/* Migrations */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Database <span className="gradient-text">Migrations</span>
            </h2>
            <p className="text-muted-foreground">
              Manage schema changes safely across environments
            </p>
          </motion.div>

          <CodeBlock
            code={migrationsExample}
            title="Working with Migrations"
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
              Ready to <span className="gradient-text">Build</span>?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/docs/auth">
                <Button rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Set Up Authentication
                </Button>
              </Link>
              <Link href="/docs/architecture">
                <Button variant="outline">Back to Architecture</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
