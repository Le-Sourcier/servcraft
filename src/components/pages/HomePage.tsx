"use client";

import { motion } from "framer-motion";
import {
  Terminal,
  Zap,
  Shield,
  Layers,
  Database,
  Globe,
  Lock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Code2,
  FileCode,
  Boxes,
  Clock,
  Scale,
  Wifi,
  Search,
  Upload,
  CreditCard,
  Bell,
  BarChart,
  Film,
  GitBranch,
  Mail,
  RefreshCw,
  Flag,
  Play,
  Cpu
} from "lucide-react";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";
import Link from "next/link";

const features = [
  {
    icon: Terminal,
    title: "Powerful CLI",
    description: "Generate projects, add modules, scaffold CRUD operations with a single command.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Layers,
    title: "Modular Architecture",
    description: "Pick only what you need. Auth, cache, websockets, payments - all as optional modules.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Shield,
    title: "Production-Ready",
    description: "Security headers, rate limiting, audit trails, and structured logging built-in.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Database,
    title: "Multi-Database",
    description: "Works with PostgreSQL, MySQL, SQLite, and MongoDB through Prisma ORM.",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    icon: Globe,
    title: "i18n Support",
    description: "Built-in internationalization with 7+ locales. Reach users worldwide.",
    gradient: "from-red-500 to-rose-500",
  },
  {
    icon: Lock,
    title: "Advanced Security",
    description: "JWT auth, RBAC, MFA, OAuth providers, and HMAC webhook signatures.",
    gradient: "from-violet-500 to-purple-500",
  },
];

const modules = [
  { name: "Authentication", icon: Lock },
  { name: "User Management", icon: UsersIcon },
  { name: "Email Service", icon: Mail },
  { name: "Redis Cache", icon: Zap },
  { name: "Rate Limiting", icon: Shield },
  { name: "Webhooks", icon: GitBranch },
  { name: "Job Queue", icon: RefreshCw },
  { name: "WebSockets", icon: Wifi },
  { name: "Search", icon: Search },
  { name: "File Upload", icon: Upload },
  { name: "MFA/TOTP", icon: Lock },
  { name: "OAuth", icon: Lock },
  { name: "Payments", icon: CreditCard },
  { name: "Notifications", icon: Bell },
  { name: "i18n", icon: Globe },
  { name: "Feature Flags", icon: Flag },
  { name: "Analytics", icon: BarChart },
  { name: "Media Processing", icon: Film },
  { name: "API Versioning", icon: GitBranch },
];

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

const stats = [
  { value: "18+", label: "Modules" },
  { value: "v0.4.9", label: "Version" },
  { value: "4", label: "Databases" },
  { value: "3", label: "Validators" },
];

export function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-bg py-16 lg:py-24">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border mb-8"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">
                Current Version: <span className="text-foreground font-medium">v0.4.9</span>
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6"
            >
              Build Backend Faster with{" "}
              <span className="gradient-text">ServCraft</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              A modular, production-ready Node.js backend framework built with
              TypeScript, Fastify, and Prisma. Generate production-ready backends
              in minutes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            >
              <Link href="/docs">
                <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Get Started
                </Button>
              </Link>
              <a
                href="https://npmjs.com/package/servcraft"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg">
                  <span className="font-mono">npm i -g servcraft</span>
                </Button>
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="max-w-xl mx-auto"
            >
              <CodeBlock
                code={`# Complete setup in under 5 minutes
npm install -g servcraft
servcraft init my-api --template full
cd my-api
npm install
npm run db:push
npm run dev`}
                title="Quick Install"
                showLineNumbers={false}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-1 px-2 py-1 rounded bg-secondary/30 border border-border">
                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-secondary rounded border border-border">⌘K</kbd>
                <span>to search</span>
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="gradient-text">Ship Faster</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Production-ready features built-in. Focus on your business logic,
              not boilerplate.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-20 lg:py-32 bg-secondary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="gradient-text">18+ Pre-built Modules</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Add powerful features with a single command. Every module is
              production-ready and battle-tested.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {modules.map((module, index) => (
              <motion.div
                key={module.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:from-primary/30 group-hover:to-accent/30 transition-all duration-300">
                    <module.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{module.name}</h4>
                    <div className="flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-muted-foreground">Ready</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link href="/modules">
              <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View All Modules
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CLI Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Powerful CLI at Your{" "}
                <span className="gradient-text">Fingertips</span>
              </h2>
              <p className="text-muted-foreground mb-8">
                Generate projects, scaffold CRUD operations, add modules, and
                more - all from the command line.
              </p>

              <div className="space-y-4">
                {[
                  { cmd: "servcraft init my-app", desc: "Create a new project" },
                  { cmd: "servcraft add auth", desc: "Add authentication module" },
                  { cmd: "servcraft scaffold post", desc: "Generate CRUD for posts" },
                  { cmd: "servcraft generate resource", desc: "Generate a resource" },
                ].map((item, i) => (
                  <motion.div
                    key={item.cmd}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4 p-3 rounded-lg bg-card border border-border"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Terminal className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <code className="text-sm text-foreground font-mono">
                        {item.cmd}
                      </code>
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {item.desc}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8">
                <Link href="/cli">
                  <Button rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Explore CLI Commands
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <CodeBlock
                title="Example: Using Services"
                code={`// Your controller using ServCraft services
import { webhookService } from '../webhook';
import { queueService } from '../queue';
import { wsService } from '../websocket';
import { strictRateLimit } from '../rate-limit';

class PostController {
  async createPost(req, res) {
    // Create the post
    const post = await db.post.create(req.body);

    // Notify external systems via webhooks
    await webhookService.publishEvent('post.created', post);

    // Queue email notifications
    await queueService.addJob('emails', 'send-email', {
      to: 'admin@example.com',
      subject: 'New Post!'
    });

    // Real-time broadcast via WebSockets
    await wsService.broadcastToAll('post:new', post);

    res.json(post);
  }
}

// Apply rate limiting
app.post('/api/posts', strictRateLimit, postController.createPost);`}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why ServCraft Section */}
      <section className="py-20 lg:py-32 bg-secondary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why <span className="gradient-text">ServCraft?</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built by developers, for developers. We understand the pain of
              setting up backends from scratch.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Clock,
                title: "Save Time",
                description: "From idea to production in hours, not days.",
              },
              {
                icon: Scale,
                title: "Scale Fast",
                description: "Built on Fastify for incredible performance.",
              },
              {
                icon: Code2,
                title: "Type-Safe",
                description: "Full TypeScript support with smart types.",
              },
              {
                icon: FileCode,
                title: "Well Documented",
                description: "Comprehensive docs and examples included.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Playground Section */}
      <section className="py-20 lg:py-32 bg-secondary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-500">New Feature</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Try ServCraft <span className="gradient-text">Online</span>
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg">
                Test ServCraft directly in your browser. No installation required.
                Write code, run it, and see the results instantly.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { icon: Play, text: "Write and execute code in seconds" },
                  { icon: Zap, text: "Test modules without setup" },
                  { icon: Shield, text: "Sandboxed environment for safety" },
                ].map((item, i) => (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              <Link href="/playground">
                <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Open Playground
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-2xl" />

                <div className="relative rounded-2xl bg-[#0d0d14] border border-border overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/50">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-xs text-muted-foreground">ServCraft Playground</span>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-2 divide-x divide-border">
                    <div className="p-4 font-mono text-sm">
                      <div className="text-muted-foreground text-xs mb-2">// Code Editor</div>
                      <div className="text-foreground space-y-1">
                        <div><span className="text-purple-400">console</span>.<span className="text-blue-400">log</span>(<span className="text-green-400">"Welcome to ServCraft!"</span>);</div>
                        <div><span className="text-purple-400">console</span>.<span className="text-blue-400">log</span>(<span className="text-green-400">"Version: 0.4.9"</span>);</div>
                        <div><span className="text-purple-400">console</span>.<span className="text-blue-400">log</span>(<span className="text-green-400">"Ready for coding!"</span>);</div>
                      </div>
                    </div>
                    <div className="p-4 font-mono text-sm">
                      <div className="text-muted-foreground text-xs mb-2">Output</div>
                      <div className="text-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          <span>Welcome to ServCraft!</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          <span>Version: 0.4.9</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          <span>Ready for coding!</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-border">
                          <span className="text-xs text-muted-foreground">Execution time: 12ms</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border mb-6">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm text-muted-foreground">Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-secondary rounded border border-border">⌘K</kbd> to search docs</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Build Faster?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of developers who are already shipping faster with
                ServCraft.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/docs">
                  <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Start Building
                  </Button>
                </Link>
                <a
                  href="https://github.com/Le-Sourcier/servcraft"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="lg">
                    View on GitHub
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
