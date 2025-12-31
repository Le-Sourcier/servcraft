"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Database,
  Server,
  RefreshCw,
  ChevronRight,
  Save,
  CheckCircle2,
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
    command: "servcraft db studio",
    description: "Open Prisma Studio UI",
    example: "npm run db:studio",
  },
];

const prismaSchemaExample = `// prisma/schema.prisma
model User {
  id    String @id @default(cuid())
  email String @unique
  name  String?
}`;

export function DatabasePage() {
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
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Supported Databases</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {databases.map((db) => (
              <div key={db.name} className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${db.bg} flex items-center justify-center`}>
                    <db.icon className={`w-6 h-6 ${db.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{db.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{db.description}</p>
                    <code className="text-xs font-mono bg-secondary px-2 py-1 rounded block w-fit">
                      {db.command}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Database Commands */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center text-center">Database Commands</h2>
          <div className="space-y-4">
            {dbCommands.map((cmd) => (
              <div key={cmd.command} className="flex flex-col md:flex-row gap-4 p-4 rounded-lg bg-card border border-border items-center">
                <div className="flex items-center gap-3 md:w-64 flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  <code className="font-mono text-sm">{cmd.command}</code>
                </div>
                <div className="flex-1 text-sm text-muted-foreground">{cmd.description}</div>
                <code className="text-xs font-mono bg-secondary px-3 py-1.5 rounded">{cmd.example}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prisma Schema */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Prisma Schema</h2>
          <CodeBlock
            code={prismaSchemaExample}
            title="prisma/schema.prisma"
          />
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link href="/docs/auth">
            <Button size="lg">Set Up Authentication</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
