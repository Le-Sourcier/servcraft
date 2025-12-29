"use client";

import { motion } from "framer-motion";
import {
  Terminal,
  ChevronRight,
  CheckCircle2,
  Box,
  Database,
  Layers,
  Zap,
  Server,
  Globe,
  Code2,
  FileCode,
  Shield,
  Cpu,
  FolderOpen,
  Play
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const steps = [
  {
    number: "01",
    title: "Install ServCraft CLI",
    description: "Install ServCraft globally on your system using npm. The CLI includes all the tools you need to generate code, manage modules, and run development servers.",
    code: "npm install -g servcraft",
    icon: Terminal,
    details: "Requires Node.js 18+ and npm, yarn, or pnpm",
  },
  {
    number: "02",
    title: "Create a New Project",
    description: "Initialize a new project with interactive setup. Choose TypeScript, database provider, validator, and template.",
    code: "servcraft init my-api",
    icon: Box,
    details: "Templates: minimal, full, microservice",
  },
  {
    number: "03",
    title: "Navigate to Project",
    description: "Change into your new project directory. All subsequent commands should be run from this directory.",
    code: "cd my-api",
    icon: FolderOpen,
    details: "Your project structure is now ready",
  },
  {
    number: "04",
    title: "Install Dependencies",
    description: "Install all project dependencies defined in package.json. This includes Fastify, Prisma, and other dependencies.",
    code: "npm install",
    icon: Zap,
    details: "Fastify for performance, Prisma ORM for database",
  },
  {
    number: "05",
    title: "Setup Database",
    description: "Initialize the database and push the schema. For development, db:push is all you need.",
    code: "npm run db:push",
    icon: Database,
    details: "For production, use migrations: npm run db:migrate",
  },
  {
    number: "06",
    title: "Start Development Server",
    description: "Start the server with hot reload. Your code changes will automatically restart the server.",
    code: "npm run dev",
    icon: Play,
    details: "Your API will be available at http://localhost:3000",
  },
];

const whatYouGet = [
  { icon: Server, title: "Fastify Server", desc: "Blazing fast HTTP server" },
  { icon: Database, title: "Prisma ORM", desc: "Type-safe database access" },
  { icon: Shield, title: "Auth Middleware", desc: "JWT authentication ready" },
  { icon: Code2, title: "TypeScript", desc: "Full type safety" },
  { icon: Layers, title: "Module System", desc: "Clean architecture" },
  { icon: FileCode, title: "Best Practices", desc: "Production-ready code" },
];

const addModules = [
  { cmd: "servcraft add auth", desc: "JWT authentication with refresh tokens" },
  { cmd: "servcraft add users", desc: "Complete user CRUD with roles" },
  { cmd: "servcraft add email", desc: "SMTP email with templates" },
  { cmd: "servcraft add cache", desc: "Redis caching with TTL" },
  { cmd: "servcraft add websocket", desc: "Real-time Socket.io" },
  { cmd: "servcraft add mfa", desc: "Two-factor authentication" },
  { cmd: "servcraft add oauth", desc: "Social login providers" },
  { cmd: "servcraft add queue", desc: "BullMQ job queues" },
  { cmd: "servcraft add search", desc: "Elasticsearch integration" },
];

const templates = [
  {
    name: "Minimal",
    desc: "Basic API structure for simple projects",
    ideal: "Learning or tiny APIs",
    files: "Core files only",
  },
  {
    name: "Full Stack",
    desc: "Complete setup with auth and users",
    ideal: "Production applications",
    files: "Auth, users, email, rate limiting",
  },
  {
    name: "Microservice",
    desc: "Lightweight setup for microservices",
    ideal: "High-performance services",
    files: "Minimal dependencies, Docker-ready",
  },
];

export default function QuickStartPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-20 lg:py-28 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Quick <span className="gradient-text">Start</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Get up and running with ServCraft in under 5 minutes. Follow this
              step-by-step guide to build your first production-ready backend.
            </p>

            <CodeBlock
              code={`# Complete setup in one go
npm install -g servcraft
servcraft init my-api
cd my-api
npm install
npm run db:push
npm run dev

# Your API is now live at http://localhost:3000`}
              title="All-in-One Setup"
              showLineNumbers={false}
            />
          </motion.div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              What You <span className="gradient-text">Get</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every ServCraft project comes with industry-standard tools and best practices
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {whatYouGet.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Project Templates */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Project <span className="gradient-text">Templates</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the template that fits your needs
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {templates.map((template, index) => (
              <motion.div
                key={template.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
              >
                <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{template.desc}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ChevronRight className="w-4 h-4 text-primary" />
                    <span>Ideal: {template.ideal}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ChevronRight className="w-4 h-4 text-primary" />
                    <span>Includes: {template.files}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Follow the <span className="gradient-text">Steps</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Six simple steps to get your ServCraft project up and running
            </p>
          </motion.div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex items-start gap-4 md:w-64 flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                      <step.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Step {step.number}
                      </div>
                      <h3 className="font-semibold">{step.title}</h3>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-muted-foreground mb-3">{step.description}</p>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <code className="font-mono text-sm text-foreground bg-secondary/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-primary" />
                        {step.code}
                      </code>
                      <span className="text-xs text-muted-foreground">{step.details}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Add Modules */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Extend with <span className="gradient-text">Modules</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Add production-ready features to your project with a single command
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {addModules.map((module, index) => (
              <motion.div
                key={module.cmd}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <code className="text-sm font-mono text-foreground block truncate">
                      {module.cmd}
                    </code>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {module.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Next */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              What's <span className="gradient-text">Next?</span>
            </h2>
            <p className="text-muted-foreground">
              Explore more resources to master ServCraft
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                title: "Documentation",
                href: "/docs",
                desc: "Complete guides and API reference",
                icon: FileCode,
              },
              {
                title: "Modules",
                href: "/modules",
                desc: "Explore all available modules",
                icon: Layers,
              },
              {
                title: "CLI Reference",
                href: "/docs/cli",
                desc: "All CLI commands explained",
                icon: Terminal,
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={item.href}
                  className="block p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 text-center group"
                >
                  <item.icon className="w-8 h-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border"
          >
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">You're All Set!</h2>
            <p className="text-muted-foreground mb-6">
              You now have a production-ready Node.js backend. Start building
              your features with ServCraft!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/docs">
                <Button size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Read Full Documentation
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
          </motion.div>
        </div>
      </section>
    </div>
  );
}
