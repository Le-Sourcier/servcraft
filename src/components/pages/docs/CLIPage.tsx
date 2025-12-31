"use client";

import { motion } from "framer-motion";
import {
  Terminal,
  ChevronRight,
  Zap,
  Shield,
  Activity,
  Code2,
  Cpu,
  FileCode,
  Database,
  Play,
  PlusCircle,
  Layers,
  Settings,
  RefreshCw,
  Download,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  FolderOpen,
  Rocket,
  Wrench,
  FileJson
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const cliCategories = [
  {
    title: "Project Initialization",
    icon: Sparkles,
    commands: [
      {
        cmd: "servcraft init <name>",
        desc: "Create a new ServCraft project with interactive setup wizard.",
        flags: ["--ts", "--js", "--prisma", "--validator", "--template", "--skip-install"],
        example: "servcraft init my-api --ts --prisma postgresql"
      },
      {
        cmd: "servcraft init",
        desc: "Initialize ServCraft in an existing directory.",
        flags: ["--ts", "--js"],
        example: "cd existing-folder && servcraft init"
      },
    ],
  },
  {
    title: "Module Management",
    icon: Layers,
    commands: [
      {
        cmd: "servcraft add <module>",
        desc: "Install a feature module into your project (auth, users, email, etc.).",
        flags: ["--force", "--skip-deps"],
        example: "servcraft add auth --force && servcraft add users && servcraft add email"
      },
      {
        cmd: "servcraft remove <module>",
        desc: "Remove a module and all its files from your project.",
        flags: ["--force"],
        example: "servcraft remove cache --force"
      },
      {
        cmd: "servcraft list",
        desc: "List all available official modules with their installation status.",
        flags: ["--installed", "--available", "--all"],
        example: "servcraft list --installed"
      },
      {
        cmd: "servcraft generate <type> <name>",
        desc: "Generate scaffold code (controller, service, schema, routes).",
        flags: ["--module"],
        example: "servcraft generate controller posts --module posts"
      },
    ],
  },
  {
    title: "Database Operations",
    icon: Database,
    commands: [
      {
        cmd: "servcraft db push",
        desc: "Sync schema with database without migrations (development).",
        flags: ["--accept-data-loss", "--skip-generate"],
        example: "servcraft db push --accept-data-loss"
      },
      {
        cmd: "servcraft db migrate dev",
        desc: "Generate and run development migrations.",
        flags: ["--name", "--create-only", "--skip-seed"],
        example: "servcraft db migrate dev --name add-users-table"
      },
      {
        cmd: "servcraft db migrate deploy",
        desc: "Deploy migrations to production without generating new ones.",
        flags: [],
        example: "servcraft db migrate deploy"
      },
      {
        cmd: "servcraft db generate",
        desc: "Regenerate Prisma client after schema changes.",
        flags: ["--schema"],
        example: "servcraft db generate"
      },
      {
        cmd: "servcraft db studio",
        desc: "Launch Prisma Studio for visual database browsing.",
        flags: ["--port", "--browser"],
        example: "servcraft db studio --port 5555"
      },
      {
        cmd: "servcraft db seed",
        desc: "Populate database with seed data from prisma/seed.ts.",
        flags: [],
        example: "servcraft db seed"
      },
      {
        cmd: "servcraft db reset",
        desc: "Reset database and re-run all migrations (destructive!).",
        flags: ["--force", "--skip-seed"],
        example: "servcraft db reset --force"
      },
    ],
  },
  {
    title: "Development Tools",
    icon: Wrench,
    commands: [
      {
        cmd: "servcraft doctor",
        desc: "Analyze environment, dependencies, and Docker settings for issues.",
        flags: ["--fix", "--verbose"],
        example: "servcraft doctor --fix"
      },
      {
        cmd: "servcraft dev",
        desc: "Start development server with hot-reload enabled.",
        flags: ["--port", "--host", "--inspect"],
        example: "servcraft dev --port 4000"
      },
      {
        cmd: "servcraft build",
        desc: "Build production-ready bundle with optimizations.",
        flags: ["--watch", "--analyze"],
        example: "servcraft build --analyze"
      },
      {
        cmd: "servcraft test",
        desc: "Run all tests (unit, integration, e2e).",
        flags: ["--watch", "--coverage", "--e2e"],
        example: "servcraft test --coverage"
      },
    ],
  },
  {
    title: "Lifecycle & Version",
    icon: RefreshCw,
    commands: [
      {
        cmd: "servcraft update",
        desc: "Update ServCraft CLI to the latest version.",
        flags: ["--check", "--latest"],
        example: "servcraft update"
      },
      {
        cmd: "servcraft version",
        desc: "Display installed ServCraft version and check for updates.",
        flags: [],
        example: "servcraft version"
      },
    ],
  },
];

const globalFlags = [
  {
    flag: "--help",
    desc: "Display help information for a command.",
    alias: "-h"
  },
  {
    flag: "--version",
    desc: "Display CLI version number.",
    alias: "-v"
  },
  {
    flag: "--verbose",
    desc: "Enable detailed logging output for debugging.",
    alias: "-V"
  },
  {
    flag: "--quiet",
    desc: "Suppress non-error output.",
    alias: "-q"
  },
  {
    flag: "--no-color",
    desc: "Disable colored output.",
    alias: ""
  },
  {
    flag: "--cwd",
    desc: "Specify working directory.",
    alias: ""
  },
  {
    flag: "--dry-run",
    desc: "Simulate command without making changes.",
    alias: ""
  },
];

const workflowExample = `// Typical ServCraft Workflow

// 1. Initialize a new project
servcraft init my-awesome-api

// 2. The wizard will guide you through:
// ✓ Language selection (TypeScript/JavaScript)
// ✓ Database provider (PostgreSQL/MySQL/SQLite)
// ✓ Validator library (Zod/Joi/Yup)
// ✓ Module selection (Auth, Users, Email, etc.)

// 3. Navigate to project
cd my-awesome-api

// 4. Add additional modules as needed
servcraft add cache
servcraft add storage

// 5. Start development server
servcraft dev

// 6. (Optional) Create a scaffold for a new resource
servcraft generate controller products

// 7. Manage database
servcraft db push              // Sync schema (development)
servcraft db studio            // Open database UI

// 8. Run tests
servcraft test

// 9. Build for production
servcraft build`;

const availableModules = `// Available Modules (servcraft list)

// Authentication
├── auth          // JWT + Refresh tokens
├── mfa            // Multi-factor authentication
├── oauth           // OAuth 2.0 providers
└── sessions        // Session management

// User Management
├── users          // User CRUD operations
├── profiles       // Extended user profiles
└── permissions     // Permission system

// Content
├── posts          // Blog/article management
├── comments       // Comment system
└── media          // File uploads & storage

// Communication
├── email          // Email sending (Nodemailer/Resend)
├── notifications   // In-app notifications
└── webhooks       // Webhook handlers

// Infrastructure
├── cache          // Redis caching layer
├── storage        // S3-compatible storage
└── queue          // Job queue (Bull/Agenda)

// Tools
├── logger         // Structured logging (Pino)
├── validator      // Request validation
└── errors         // Error handling utilities`;

const advancedUsage = `// Advanced CLI Usage

// Module installation with multiple modules
servcraft add auth users email cache storage --skip-deps

// Generate multiple files at once
servcraft generate controller posts
servcraft generate service posts
servcraft generate schema posts
servcraft generate routes posts

// Database operations with custom schema
servcraft db generate --schema ./custom-schema.prisma
servcraft db push --accept-data-loss

// Development with custom port
servcraft dev --port 8080 --host 0.0.0.0

// Testing with coverage report
servcraft test --coverage --e2e

// Doctor command with auto-fix
servcraft doctor --fix --verbose

// Dry-run to see what would happen
servcraft add auth --dry-run`;

export function CLIPage() {
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
                <Terminal className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  CLI <span className="gradient-text">Commands</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Master command line to build faster than ever
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Speed Dial */}
      <section className="py-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            {cliCategories.slice(0, 2).map((category) => (
              <div key={category.title} className="p-8 rounded-3xl bg-white/5 border border-white/10">
                <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <category.icon className="w-5 h-5" />
                  {category.title}
                </h3>
                <div className="space-y-4">
                  {category.commands.map((cmd) => (
                    <div key={cmd.cmd} className="flex items-start gap-3">
                      <code className="bg-[#0a0a0f] px-3 py-1.5 rounded-lg text-white font-mono text-xs border border-white/5 flex-shrink-0">
                        {cmd.cmd}
                      </code>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground leading-relaxed">{cmd.desc}</p>
                        {cmd.example && (
                          <div className="mt-2 text-[10px] text-muted-foreground font-mono bg-[#0a0a0f] px-2 py-1 rounded flex-1">
                            Example: {cmd.example}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All Commands */}
      <section className="py-16 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {cliCategories.slice(2).map((category) => (
              <div key={category.title}>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <category.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">{category.title}</h2>
                </div>
                <div className="grid gap-6">
                  {category.commands.map((cmd) => (
                    <div key={cmd.cmd} className="p-6 rounded-3xl bg-card border border-border hover:border-primary/20 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Terminal className="w-5 h-5 text-primary" />
                          <code className="text-lg font-bold font-mono text-white">{cmd.cmd}</code>
                        </div>
                        {cmd.flags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {cmd.flags.map((f) => (
                              <span key={f} className="text-[9px] font-mono text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">{f}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{cmd.desc}</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] text-primary/60 uppercase tracking-wider">Example:</span>
                          <code className="text-xs font-mono text-white bg-[#0a0a0f] px-2 py-1 rounded flex-1">{cmd.example}</code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Flags */}
      <section className="py-16 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Global Flags</h2>
            <p className="text-muted-foreground">Universal options available for every command.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalFlags.map((flag) => (
              <div key={flag.flag} className="p-5 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-bold font-mono text-white">{flag.flag}</code>
                  {flag.alias && <span className="text-[9px] text-muted-foreground font-mono bg-white/5 px-1.5 py-0.5 rounded">{flag.alias}</span>}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{flag.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Rocket className="w-6 h-6 text-primary" />
                Typical Workflow
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Here's a standard development workflow from project initialization to production deployment.
                Follow this pattern to get up and running quickly.
              </p>
              <CodeBlock
                code={workflowExample}
                title="Standard development workflow"
                showLineNumbers={true}
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4">Available Modules</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                ServCraft provides a rich ecosystem of pre-built modules.
                Use <code className="text-primary">servcraft list</code> to see all available modules
                and their current installation status.
              </p>
              <div className="p-6 rounded-3xl bg-[#0a0a0f] border border-white/5">
                <pre className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono">{availableModules}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Usage */}
      <section className="py-16 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <CodeBlock
              code={advancedUsage}
              title="Advanced CLI patterns"
              showLineNumbers={true}
            />
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Settings className="w-6 h-6 text-primary" />
                Pro Tips
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Master these advanced patterns to speed up your development workflow and handle edge cases.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Batch Operations</h4>
                  <p className="text-xs text-muted-foreground">Add multiple modules at once with <code className="text-primary">--skip-deps</code></p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Dry-Run Mode</h4>
                  <p className="text-xs text-muted-foreground">Preview changes before executing with <code className="text-primary">--dry-run</code></p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Custom Port</h4>
                  <p className="text-xs text-muted-foreground">Run dev server on any port with <code className="text-primary">--port</code></p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Auto-Fix</h4>
                  <p className="text-xs text-muted-foreground">Let doctor auto-fix environment issues</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Ready to build?</h2>
          <p className="text-muted-foreground mb-8">
            Now that you know the CLI commands, explore the API documentation
            to understand how to use the generated code.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/docs/api">
              <Button size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
                Explore API Documentation
              </Button>
            </Link>
            <Link href="/docs/architecture">
              <Button variant="outline" size="lg">View Architecture</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
