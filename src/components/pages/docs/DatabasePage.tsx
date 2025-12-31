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
  Table,
  Zap,
  Shield,
  Key,
  Code2,
  Terminal,
  Grid
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
    description: "Production-ready, highly reliable relational database. Recommended for most applications.",
    features: ["JSONB Support", "Full-text search", "GIN Indexes"]
  },
  {
    name: "MySQL",
    icon: Server,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    description: "Battle-tested, reliable and widely used open-source relational database.",
    features: ["Query caching", "High availability", "Large ecosystem"]
  },
  {
    name: "SQLite",
    icon: Save,
    color: "text-gray-400",
    bg: "bg-gray-400/10",
    description: "Zero-config, file-based database. Ideal for development and small projects.",
    features: ["Single file", "In-memory mode", "Perfect for testing"]
  },
  {
    name: "MongoDB",
    icon: Grid,
    color: "text-green-400",
    bg: "bg-green-400/10",
    description: "NoSQL document database for applications requiring flexible schemas.",
    features: ["Flexible schema", "Easy scaling", "JSON documents"]
  },
];

const dbTools = [
  {
    name: "Prisma Client",
    description: "Auto-generated and type-safe query builder for TypeScript.",
    usage: "await db.user.create({ data: { ... } })"
  },
  {
    name: "Prisma Studio",
    description: "Visual editor for your database. View and edit data easily.",
    usage: "servcraft db studio"
  }
];

const dbCommands = [
  { command: "servcraft db push", desc: "Sync your schema with the database without migrations (perfect for prototyping).", icon: Zap },
  { command: "servcraft db migrate", desc: "Generate and run industrial-strength SQL migrations for production.", icon: Shield },
  { command: "servcraft db generate", desc: "Regenerate the Prisma client after schema changes.", icon: RefreshCw },
  { command: "servcraft db status", desc: "Check if your database is in sync with your local schema.", icon: Table },
];

const schemaExample = `// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
}

enum Role {
  USER
  ADMIN
}`;

export function DatabasePage() {
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
                <Database className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  <span className="gradient-text">Database</span> Layer
                </h1>
                <p className="text-muted-foreground mt-1">
                  Type-safe data management with Prisma ORM support
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Overview */}
      <section className="py-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-white">The Power of Prisma</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                ServCraft leverages **Prisma**, the next-generation Node.js and TypeScript ORM.
                It turns your database schema into a fully type-safe API, preventing runtime errors and providing
                an unmatched developer experience with auto-completion.
              </p>
              <div className="space-y-4">
                {dbTools.map((tool) => (
                  <div key={tool.name} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h4 className="text-sm font-bold text-white mb-1">{tool.name}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{tool.description}</p>
                    <code className="text-xs text-primary font-mono">{tool.usage}</code>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
              <CodeBlock
                code={schemaExample}
                title="prisma/schema.prisma"
                showLineNumbers={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Supported Engines */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Supported Database Engines</h2>
            <p className="text-muted-foreground">Select your engine during initialization with <code className="text-primary">--prisma &lt;engine&gt;</code></p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {databases.map((db) => (
              <div key={db.name} className="p-6 rounded-2xl bg-card border border-border flex flex-col h-full hover:border-primary/50 transition-all">
                <div className={`w-12 h-12 rounded-xl ${db.bg} flex items-center justify-center mb-4`}>
                  <db.icon className={`w-6 h-6 ${db.color}`} />
                </div>
                <h3 className="text-lg font-bold mb-2">{db.name}</h3>
                <p className="text-xs text-muted-foreground mb-4 flex-1Leading-relaxed">{db.description}</p>
                <div className="space-y-2">
                  {db.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-[10px] text-foreground/70">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commands Reference */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Database Management CLI</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {dbCommands.map((cmd) => (
              <div key={cmd.command} className="p-5 rounded-2xl bg-card border border-border group hover:border-primary/30 transition-all">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <cmd.icon className="w-5 h-5 text-primary" />
                  </div>
                  <code className="text-sm font-mono text-white">{cmd.command}</code>
                </div>
                <p className="text-sm text-muted-foreground">{cmd.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4 text-white font-bold">Ready to secure your data?</h2>
          <p className="text-muted-foreground mb-8">Learn how to implement user-level security and authentication.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/docs/auth">
              <Button size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
                Authentication Guide
              </Button>
            </Link>
            <Link href="/docs/api">
              <Button variant="outline" size="lg">
                API Reference
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
