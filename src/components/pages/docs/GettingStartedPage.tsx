"use client";

import type { Route } from 'next';
import { motion } from "framer-motion";
import {
  Terminal,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Package,
  Zap,
  Globe,
  Database,
  Shield,
  Code2,
  Rocket,
  Layers,
  Lock,
  Terminal as TerminalIcon
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const features = [
  {
    icon: Rocket,
    title: "Production Ready",
    description: "Generate backend code that's ready for production with best practices baked in."
  },
  {
    icon: Layers,
    title: "Modular Architecture",
    description: "Organize your code in self-contained modules that are easy to maintain and test."
  },
  {
    icon: Lock,
    title: "Secure by Default",
    description: "Built-in authentication, authorization, rate limiting, and security headers."
  },
  {
    icon: Zap,
    title: "High Performance",
    description: "Powered by Fastify for blazing fast request handling and low latency."
  }
];

const requirements = [
  { icon: CheckCircle2, text: "Node.js 18+ installed" },
  { icon: CheckCircle2, text: "npm, yarn, or pnpm" },
  { icon: CheckCircle2, text: "A code editor (VS Code recommended)" },
  { icon: CheckCircle2, text: "Git for version control" },
];

const steps = [
  {
    step: "01",
    title: "Install ServCraft CLI",
    description: "Install ServCraft globally on your system using npm. This gives you access to the servcraft command-line tool for creating and managing projects.",
    code: "npm install -g servcraft",
    details: "The CLI includes all the tools you need to generate code, manage modules, and run development servers."
  },
  {
    step: "02",
    title: "Verify Installation",
    description: "Check that ServCraft is installed correctly and see the installed version.",
    code: "servcraft --version",
    details: "You should see something like: ServCraft v0.4.9"
  },
  {
    step: "03",
    title: "Create a New Project",
    description: "Initialize a new project with interactive setup. The CLI will guide you through choosing your preferences.",
    code: "servcraft init my-app",
    details: "You'll be prompted to select: TypeScript/JavaScript, database provider (PostgreSQL, MySQL, etc.), validator library, and module system."
  },
  {
    step: "04",
    title: "Navigate to Project",
    description: "Change into your new project directory.",
    code: "cd my-app",
    details: "All subsequent commands should be run from this directory."
  },
  {
    step: "05",
    title: "Install Dependencies",
    description: "Install all project dependencies defined in package.json.",
    code: "npm install",
    details: "This installs Fastify, Prisma, and all other dependencies your project needs."
  },
  {
    step: "06",
    title: "Setup Database",
    description: "Initialize the database and push the schema. For development, this is all you need.",
    code: "npm run db:push",
    details: "For production, use migrations: npm run db:migrate"
  },
  {
    step: "07",
    title: "Start Development Server",
    description: "Start the development server with hot reload. Your code changes will automatically restart the server.",
    code: "npm run dev",
    details: "Your API will be available at http://localhost:3000"
  }
];

const templates = [
  {
    name: "Minimal",
    description: "Basic API structure with core files only. Perfect for simple projects or learning.",
    command: "servcraft init my-api --template minimal",
    includes: ["Fastify setup", "Basic Prisma schema", "Error handling", "No modules"]
  },
  {
    name: "Full Stack",
    description: "Complete setup with auth, users, and common modules. Best for production applications.",
    command: "servcraft init my-app --template full",
    includes: ["JWT Authentication", "User management", "Email module", "Rate limiting"]
  },
  {
    name: "Microservice",
    description: "Lightweight setup for microservices. Minimal dependencies, focused on performance.",
    command: "servcraft init my-service --template microservice",
    includes: ["Minimal files", "Fastify native", "No ORM overhead", "Docker-ready"]
  }
];

const projectOptions = [
  { flag: "--ts", desc: "Use TypeScript (default)", default: true },
  { flag: "--js", desc: "Use JavaScript instead of TypeScript" },
  { flag: "--prisma <db>", desc: "Database: postgres, mysql, sqlite, mongodb", default: "postgres" },
  { flag: "--validator <lib>", desc: "Validator: zod, joi, yup", default: "zod" },
  { flag: "--esm", desc: "Use ESM modules (.js)" },
  { flag: "--cjs", desc: "Use CommonJS modules (.js/.cjs)" },
  { flag: "--template <name>", desc: "Project template: minimal, full, microservice" },
  { flag: "--force", desc: "Overwrite existing directory" },
  { flag: "--dry-run", desc: "Preview changes without creating files" },
];

const troubleshooting = [
  {
    problem: "Command not found: servcraft",
    solution: "Make sure npm global modules are in your PATH. Try: npm config get prefix and add that to your PATH."
  },
  {
    problem: "Permission denied when installing",
    solution: "Use sudo npm install -g servcraft (Linux/Mac) or run as Administrator (Windows)."
  },
  {
    problem: "Database connection failed",
    solution: "Check your DATABASE_URL in .env. Make sure your database server is running."
  },
  {
    problem: "Port 3000 already in use",
    solution: "Set a different PORT in your .env file or stop the other process using the port."
  }
];

export function GettingStartedPage() {
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
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  Getting <span className="gradient-text">Started</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Install ServCraft and create your first project in minutes
                </p>
              </div>
            </div>

            <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
              ServCraft is a modular Node.js backend framework that helps you build
              production-ready APIs quickly. Generate clean, maintainable code with
              built-in best practices.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link href="/quickstart">
                <Button size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Quick Start Guide
                </Button>
              </Link>
              <a href="https://npmjs.com/package/servcraft" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" leftIcon={<Package className="w-4 h-4" />}>
                  View on NPM
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why ServCraft */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Why <span className="gradient-text">ServCraft</span>?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for developers who want clean, maintainable code without sacrificing
              flexibility or performance.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              System <span className="gradient-text">Requirements</span>
            </h2>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {requirements.map((req, index) => (
              <motion.div
                key={req.text}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border"
              >
                <req.icon className="w-5 h-5 text-green-500" />
                <span className="text-sm">{req.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Installation Steps */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Installation <span className="gradient-text">Steps</span>
            </h2>
            <p className="text-muted-foreground">
              Follow these steps to get ServCraft up and running
            </p>
          </motion.div>

          <div className="space-y-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-xl bg-card border border-border"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex items-start gap-4 md:w-64 flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{step.step}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex-1 md:ml-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <TerminalIcon className="w-4 h-4 text-primary flex-shrink-0" />
                      <code className="font-mono text-sm text-foreground bg-secondary/30 px-3 py-1.5 rounded-lg block">
                        {step.code}
                      </code>
                    </div>
                    {step.details && (
                      <p className="text-xs text-muted-foreground ml-6">{step.details}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Install */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              All-in-One <span className="gradient-text">Setup</span>
            </h2>
            <p className="text-muted-foreground">
              Run these commands to get started quickly
            </p>
          </motion.div>

          <CodeBlock
            code="# Complete setup in one go
npm install -g servcraft
servcraft init my-awesome-api
cd my-awesome-api
npm install
npm run db:push
npm run dev

# Your API will be available at http://localhost:3000"
            title="Complete Setup"
          />
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
            <p className="text-muted-foreground">
              Choose a template that fits your needs
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {templates.map((template, index) => (
              <motion.div
                key={template.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
              >
                <h3 className="font-semibold mb-2">{template.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded block mb-4">
                  {template.command}
                </code>
                <div className="space-y-1">
                  {template.includes.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CLI Options */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              CLI <span className="gradient-text">Options</span>
            </h2>
            <p className="text-muted-foreground">
              Customize your project setup with these options
            </p>
          </motion.div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="grid sm:grid-cols-2 gap-4">
              {projectOptions.map((opt) => (
                <div key={opt.flag} className="flex items-start gap-3">
                  <code className="font-mono text-sm bg-secondary px-2 py-0.5 rounded flex-shrink-0 text-primary">
                    {opt.flag}
                  </code>
                  <div>
                    <span className="text-sm">{opt.desc}</span>
                    {opt.default && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (default: {opt.default})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Troubleshooting <span className="gradient-text">Common Issues</span>
            </h2>
          </motion.div>

          <div className="space-y-4">
            {troubleshooting.map((item, index) => (
              <motion.div
                key={item.problem}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl bg-card border border-border"
              >
                <h3 className="font-semibold text-red-400 mb-2">{item.problem}</h3>
                <p className="text-sm text-muted-foreground">
                  <span className="text-green-500 font-medium">Solution:</span> {item.solution}
                </p>
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
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Next <span className="gradient-text">Steps</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {( [
              { icon: Database, title: "Project Structure", href: "/docs/structure", desc: "Learn the project layout" },
              { icon: Shield, title: "Authentication", href: "/docs/auth", desc: "Set up auth module" },
              { icon: Code2, title: "CLI Reference", href: "/docs/cli", desc: "Explore all commands" },
              { icon: Globe, title: "Modules", href: "/modules", desc: "Add more features" },
            ] as const).map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={item.href as Route}
                  className="block p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 text-center group"
                >
                  <item.icon className="w-8 h-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
