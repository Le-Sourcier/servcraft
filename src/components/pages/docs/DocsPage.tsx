"use client";

import type { Route } from 'next';
import { motion } from "framer-motion";
import {
  Terminal,
  FileCode,
  Database,
  Shield,
  Layers,
  BookOpen,
  ChevronRight,
  Code2,
  Cpu,
  Globe,
  Zap,
  Sparkles,
  Settings,
  ArrowRight,
  Lightbulb,
  Rocket,
  ArrowLeft,
  LifeBuoy
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const learningPaths = [
  {
    title: "New to Backend?",
    description: "Start with our Step-by-Step guide to build your first API from scratch.",
    href: "/docs/getting-started",
    icon: Rocket,
    label: "Beginners"
  },
  {
    title: "Fastify Expert?",
    description: "Jump straight into our modular architecture and plugin system.",
    href: "/docs/architecture",
    icon: Zap,
    label: "Advanced"
  },
  {
    title: "Migration Guide",
    description: "Learn how to move your existing Express or NestJS app to ServCraft.",
    href: "/docs/structure",
    icon: RefreshCw,
    label: "Migrators"
  }
];

const docSections = [
  {
    icon: Sparkles,
    title: "Foundations",
    description: "Essential setup and core philosophy of the framework.",
    href: "/docs/getting-started",
    color: "from-blue-500 to-cyan-500",
    items: [
      { label: "Installation & Requirements", href: "/docs/getting-started" },
      { label: "CLI 5-Minute Quickstart", href: "/quickstart" },
      { label: "Philosophy & Roadmap", href: "/docs" },
    ],
  },
  {
    icon: Layers,
    title: "Architecture",
    description: "How the engine works under the hood.",
    href: "/docs/architecture",
    color: "from-purple-500 to-pink-500",
    items: [
      { label: "Layered Design Pattern", href: "/docs/architecture" },
      { label: "Folder Organization", href: "/docs/structure" },
      { label: "Configuration & Environment", href: "/docs/configuration" },
    ],
  },
  {
    icon: Shield,
    title: "Core Features",
    description: "Master the fundamental modules of every backend.",
    href: "/docs/auth",
    color: "from-green-500 to-emerald-500",
    items: [
      { label: "Authentication & Security", href: "/docs/auth" },
      { label: "Database & Prisma ORM", href: "/docs/database" },
      { label: "Validation & Error Handling", href: "/docs/api" },
    ],
  },
  {
    icon: Terminal,
    title: "References",
    description: "Detailed documentation for power users.",
    href: "/docs/cli",
    color: "from-orange-500 to-amber-500",
    items: [
      { label: "CLI Command Catalog", href: "/docs/cli" },
      { label: "Internal API Services", href: "/docs/api" },
      { label: "TypeScript Definitions", href: "/docs/api" },
    ],
  }
];

function RefreshCw(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
  );
}

export function DocsPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 lg:py-24 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  The <span className="gradient-text">Handbook</span>
                </h1>
                <p className="text-muted-foreground mt-1 text-lg">
                  Deep dive into modular Node.js engineering
                </p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-2xl text-lg mb-8">
              ServCraft is more than a boilerplate. It's a set of architectural opinions,
              carefully selected tools, and automation scripts designed to take your
              ideas to production without the technical debt.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Learning Paths */}
      <section className="py-12 border-b border-white/5 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-8">Choose your path</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {learningPaths.map((path) => (
              <Link key={path.title} href={path.href as Route} className="group p-6 rounded-3xl bg-card border border-border hover:border-primary/30 transition-all shadow-sm">
                <div className="flex items-center justify-between mb-4">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <path.icon className="w-5 h-5 text-primary" />
                   </div>
                   <span className="text-[10px] font-bold px-2 py-1 rounded bg-white/5 text-muted-foreground uppercase tracking-wider">{path.label}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{path.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{path.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12">
             {/* Text Content Sidebar */}
             <div className="lg:col-span-4 space-y-8">
                <div>
                   <h2 className="text-2xl font-bold text-white mb-4">Why ServCraft?</h2>
                   <p className="text-sm text-muted-foreground leading-relaxed">
                      We observed that most developers spend 40% of their time setting up the same features: Auth, DB Connections, Caching, and Validation.
                      ServCraft automates this boredom so you can focus on the unique 60% of your business.
                   </p>
                </div>
                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                   <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" /> Pro Tip
                   </h4>
                   <p className="text-xs text-muted-foreground leading-relaxed italic">
                      "Use the <code className="text-primary font-bold">servcraft add</code> command to inject whole modules into your existing apps. It's like Lego for backends."
                   </p>
                </div>
                <div className="space-y-4">
                   <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Framework Tech Stack</h3>
                   <div className="flex flex-wrap gap-2">
                      {["Fastify", "Prisma", "TypeScript", "Zod", "Vitest", "Docker", "Pino", "Redis"].map(t => (
                        <span key={t} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-foreground/70 font-mono">{t}</span>
                      ))}
                   </div>
                </div>
                <div className="p-5 rounded-xl bg-secondary/5 border border-white/5">
                   <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Community Stats</h3>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 rounded-lg bg-white/5">
                         <div className="text-lg font-bold text-primary">10k+</div>
                         <div className="text-[10px] text-muted-foreground">Projects</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-white/5">
                         <div className="text-lg font-bold text-primary">50+</div>
                         <div className="text-[10px] text-muted-foreground">Modules</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-white/5">
                         <div className="text-lg font-bold text-primary">99.9%</div>
                         <div className="text-[10px] text-muted-foreground">Uptime</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-white/5">
                         <div className="text-lg font-bold text-primary">&lt; 50ms</div>
                         <div className="text-[10px] text-muted-foreground">Response</div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Grid of Sections */}
             <div className="lg:col-span-8 grid sm:grid-cols-2 gap-4">
                {docSections.map((section) => (
                  <div key={section.title} className="p-1 rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent">
                    <div className="h-full p-8 rounded-[1.9rem] bg-card border border-white/5 flex flex-col group hover:border-primary/20 transition-all">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-6 shadow-lg shadow-black/20`}>
                        <section.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{section.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">{section.description}</p>

                      <div className="space-y-3 pt-6 border-t border-white/5">
                        {section.items.map(item => (
                          <Link key={item.label} href={item.href as Route} className="flex items-center justify-between text-xs text-muted-foreground hover:text-primary transition-colors group/item">
                            {item.label}
                            <ArrowRight className="w-3 h-3 -translate-x-2 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100 transition-all" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 bg-secondary/5 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Our Philosophy</h2>
            <p className="text-muted-foreground">
              The design principles that guide every architectural decision in ServCraft.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
             <div className="p-6 rounded-3xl bg-card border border-border">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                   <Code2 className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Type-Safety First</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                   Every piece of data has a type. From database models to API responses, TypeScript ensures compile-time correctness and IDE autocompletion.
                </p>
             </div>
             <div className="p-6 rounded-3xl bg-card border border-border">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                   <Layers className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Module-First Architecture</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                   Group code by feature, not by file type. Each module is self-contained with its own controllers, services, and models.
                </p>
             </div>
             <div className="p-6 rounded-3xl bg-card border border-border">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mb-4">
                   <Shield className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Security by Default</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                   JWT tokens with refresh rotation, RBAC permissions, input validation, and SQL injection protection built-in from day one.
                </p>
             </div>
             <div className="p-6 rounded-3xl bg-card border border-border">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mb-4">
                   <Zap className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Zero Runtime Magic</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                   No heavy decorators or runtime reflection. Everything is explicit, making your code predictable and easy to debug.
                </p>
             </div>
             <div className="p-6 rounded-3xl bg-card border border-border">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mb-4">
                   <Database className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Database-First Development</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                   Define your schema in Prisma, generate types, and let the framework handle migrations. Your code always matches your database.
                </p>
             </div>
             <div className="p-6 rounded-3xl bg-card border border-border">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                   <Cpu className="w-6 h-6 text-cyan-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Performance Optimized</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                   Fastify's benchmark-winning performance, Redis caching, connection pooling, and query optimization out of the box.
                </p>
             </div>
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
             <div>
                <h2 className="text-3xl font-bold mb-6">Essential Resources</h2>
                <p className="text-muted-foreground leading-relaxed mb-8">
                   Everything you need to master ServCraft, from official documentation to community guides and video tutorials.
                </p>
                <div className="space-y-4">
                   <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                         <BookOpen className="w-5 h-5 text-primary" />
                         <h4 className="font-bold text-white">Official Documentation</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Complete reference for all modules, CLI commands, and API endpoints.</p>
                      <Link href="/docs/getting-started" className="text-xs text-primary hover:text-primary/80">Start reading →</Link>
                   </div>
                   <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                         <Globe className="w-5 h-5 text-primary" />
                         <h4 className="font-bold text-white">GitHub Repository</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Source code, issue tracker, and contribution guidelines.</p>
                      <a href="https://github.com/Le-Sourcier/servcraft" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:text-primary/80">Visit repo →</a>
                   </div>
                   <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                         <Settings className="w-5 h-5 text-primary" />
                         <h4 className="font-bold text-white">NPM Package</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Install ServCraft CLI and core dependencies via npm.</p>
                      <CodeBlock code="npm install -g servcraft" showLineNumbers={false} />
                   </div>
                </div>
             </div>
             <div>
                <h2 className="text-3xl font-bold mb-6">Learning Roadmap</h2>
                <p className="text-muted-foreground leading-relaxed mb-8">
                   Follow this structured path to become a ServCraft expert from beginner to advanced.
                </p>
                <CodeBlock
                   code={`// ServCraft Learning Path

// Week 1: Foundations
├── Install Node.js 18+ and ServCraft CLI
├── Create your first project: servcraft init my-app
├── Understand module structure (src/modules/)
├── Learn basic routing and controllers
└── Run your first migration: servcraft db push

// Week 2: Core Features
├── Add authentication: servcraft add auth
├── Understand JWT tokens and refresh flow
├── Add database models with Prisma
├── Implement input validation with Zod
└── Write your first unit test

// Week 3: Advanced Architecture
├── Add caching layer: servcraft add cache
├── Implement RBAC permissions
├── Create custom services and DTOs
├── Add file storage: servcraft add storage
└── Set up logging with Pino

// Week 4: Production Ready
├── Docker containerization
├── Environment configuration
├── CI/CD pipeline setup
├── Performance monitoring
└── Security hardening

// Beyond: Expert Level
├── Create your own modules
├── Contribute to core framework
├── Optimize database queries
├── Implement WebSocket support
└── Build microservices architecture
`}
                   title="Learning roadmap"
                   showLineNumbers={true}
                />
             </div>
          </div>
        </div>
      </section>

      {/* Quick Start Code */}
      <section className="py-20 bg-secondary/5 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
             <div>
                <h2 className="text-3xl font-bold mb-4">5-Minute Quickstart</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                   Go from zero to a running API in just a few commands. ServCraft handles all the boilerplate so you can focus on business logic.
                </p>
                <div className="space-y-3">
                   <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">1</div>
                      <p className="text-sm text-muted-foreground">Install the CLI globally</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">2</div>
                      <p className="text-sm text-muted-foreground">Initialize a new project with the wizard</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">3</div>
                      <p className="text-sm text-muted-foreground">Add modules as needed (auth, users, email...)</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">4</div>
                      <p className="text-sm text-muted-foreground">Run migrations and start development server</p>
                   </div>
                </div>
             </div>
             <CodeBlock
                code="# Install ServCraft CLI
npm install -g servcraft

# Create a new project
servcraft init my-awesome-api

# Navigate to your project
cd my-awesome-api

# Add authentication module
servcraft add auth

# Add users module
servcraft add users

# Sync database schema
servcraft db push

# Start development server
servcraft dev

# Your API is now running at http://localhost:3000"
                title="Quick start commands"
                showLineNumbers={true}
             />
          </div>
        </div>
      </section>

      {/* Support section */}
      <section className="py-20 bg-secondary/10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col lg:flex-row items-center gap-8 justify-between p-12 rounded-[40px] bg-gradient-to-br from-white/5 to-transparent border border-white/10">
              <div className="max-w-lg">
                 <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-6">
                    <LifeBuoy className="w-6 h-6 text-orange-500" />
                 </div>
                 <h2 className="text-3xl font-bold text-white mb-4">Build together</h2>
                 <p className="text-muted-foreground">
                    Encountered a bug or have a suggestion? Our GitHub issues are the best place to communicate with the core maintainers.
                 </p>
              </div>
              <div className="flex gap-4">
                 <a href="https://github.com/Le-Sourcier/servcraft/issues" target="_blank" rel="noopener noreferrer">
                    <Button size="lg" variant="outline" leftIcon={<Github className="w-5 h-5" />}>Submit feedback</Button>
                 </a>
                 <Link href="/playground">
                    <Button size="lg">Try Playground</Button>
                 </Link>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
}

function Github(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
  );
}
