"use client";

import { motion } from "framer-motion";
import {
  Terminal,
  ChevronRight,
  ArrowLeft,
  Copy,
  Check,
  Box,
  Layers,
  FileCode,
  Trash2,
  RefreshCw,
  Stethoscope,
  Sparkles,
  BookOpen,
  Database,
  Settings
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";
import { cn } from "@/lib/utils";
import { useState } from "react";

const cliCommands = [
  {
    command: "servcraft init <name>",
    description: "Initialize a new ServCraft project with interactive setup.",
    icon: Box,
    examples: [
      "servcraft init my-app",
      "servcraft init api --ts --prisma postgres",
    ],
    options: [
      { flag: "--ts", desc: "Use TypeScript (default)" },
      { flag: "--js", desc: "Use JavaScript" },
      { flag: "--prisma <db>", desc: "Database: postgres, mysql, sqlite, mongodb" },
      { flag: "--validator <lib>", desc: "Validator: zod, joi, yup" },
      { flag: "--esm", desc: "Use ESM modules" },
      { flag: "--cjs", desc: "Use CommonJS modules" },
    ],
  },
  {
    command: "servcraft add <module>",
    description: "Add a pre-built module to your project.",
    icon: Layers,
    examples: [
      "servcraft add auth",
      "servcraft add users --crud",
      "servcraft add email --templates",
    ],
    options: [
      { flag: "--crud", desc: "Generate CRUD for the module" },
      { flag: "--templates", desc: "Include email templates" },
      { flag: "--dry-run", desc: "Preview changes without writing" },
    ],
  },
  {
    command: "servcraft generate <type> <name>",
    description: "Generate code for controllers, services, or schemas.",
    icon: FileCode,
    examples: [
      "servcraft generate controller post",
      "servcraft generate service user",
      "servcraft generate schema product",
    ],
    options: [
      { flag: "--with-tests", desc: "Generate test files" },
      { flag: "--dry-run", desc: "Preview changes without writing" },
    ],
  },
  {
    command: "servcraft scaffold <name>",
    description: "Generate complete CRUD operations for a resource.",
    icon: Layers,
    examples: [
      "servcraft scaffold blog",
      "servcraft scaffold product --with-tests",
    ],
    options: [
      { flag: "--with-tests", desc: "Generate test files" },
      { flag: "--dry-run", desc: "Preview changes without writing" },
    ],
  },
  {
    command: "servcraft list",
    description: "List all available modules with their status.",
    icon: Box,
    examples: ["servcraft list", "servcraft list --available"],
    options: [
      { flag: "--available", desc: "Show only available modules" },
      { flag: "--installed", desc: "Show only installed modules" },
    ],
  },
  {
    command: "servcraft remove <module>",
    description: "Remove a module from your project.",
    icon: Trash2,
    examples: [
      "servcraft remove auth",
      "servcraft remove users --keep-files",
    ],
    options: [
      { flag: "--keep-files", desc: "Keep generated files" },
    ],
  },
  {
    command: "servcraft update",
    description: "Update ServCraft and installed modules to latest versions.",
    icon: RefreshCw,
    examples: [
      "servcraft update",
      "servcraft update --modules-only",
    ],
    options: [
      { flag: "--modules-only", desc: "Update only modules" },
      { flag: "--dry-run", desc: "Preview changes without applying" },
    ],
  },
  {
    command: "servcraft doctor",
    description: "Diagnose project configuration and dependencies.",
    icon: Stethoscope,
    examples: ["servcraft doctor", "servcraft doctor --fix"],
    options: [
      { flag: "--fix", desc: "Auto-fix common issues" },
      { flag: "--verbose", desc: "Show detailed output" },
    ],
  },
  {
    command: "servcraft templates",
    description: "Manage custom code generation templates.",
    icon: Sparkles,
    examples: [
      "servcraft templates list",
      "servcraft templates add my-template",
      "servcraft templates remove my-template",
    ],
    options: [],
  },
  {
    command: "servcraft docs",
    description: "Generate API documentation in various formats.",
    icon: BookOpen,
    examples: [
      "servcraft docs generate",
      "servcraft docs export postman",
      "servcraft docs status",
    ],
    options: [
      { flag: "--format <fmt>", desc: "Output format: openapi, postman, yaml" },
      { flag: "--output <path>", desc: "Output file path" },
    ],
  },
  {
    command: "servcraft db <command>",
    description: "Database management commands.",
    icon: Database,
    examples: [
      "servcraft db migrate",
      "servcraft db push",
      "servcraft db seed",
      "servcraft db studio",
    ],
    options: [],
    subcommands: [
      { cmd: "migrate", desc: "Run Prisma migrations" },
      { cmd: "push", desc: "Push schema changes" },
      { cmd: "generate", desc: "Generate Prisma client" },
      { cmd: "seed", desc: "Run database seeders" },
      { cmd: "reset", desc: "Reset database" },
      { cmd: "status", desc: "Show migration status" },
      { cmd: "studio", desc: "Open Prisma Studio" },
    ],
  },
  {
    command: "servcraft completion",
    description: "Generate shell completion scripts.",
    icon: Settings,
    examples: [
      "servcraft completion bash",
      "servcraft completion zsh",
      "servcraft completion fish",
    ],
    options: [],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className={cn(
        "p-1.5 rounded-lg transition-all duration-200",
        copied
          ? "text-green-400 bg-green-400/10"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      )}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function CliPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-20 lg:py-32 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow">
                <Terminal className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              CLI <span className="gradient-text">Reference</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Complete reference for all ServCraft CLI commands. Build backends
              faster from your terminal.
            </p>

            <CodeBlock
              code="# Install ServCraft globally
npm install -g servcraft

# Verify installation
servcraft --version"
              title="Installation"
              showLineNumbers={false}
            />
          </motion.div>
        </div>
      </section>

      {/* Commands List */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {cliCommands.map((cmd, index) => (
              <motion.div
                key={cmd.command}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-6 rounded-2xl bg-card border border-border"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <cmd.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-lg font-mono text-foreground">
                        {cmd.command}
                      </code>
                      <CopyButton text={cmd.command} />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {cmd.description}
                    </p>
                  </div>
                </div>

                {/* Examples */}
                {cmd.examples.length > 0 && (
                  <div className="ml-14 mb-4">
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                      Examples
                    </p>
                    <div className="space-y-1">
                      {cmd.examples.map((example) => (
                        <div
                          key={example}
                          className="flex items-center gap-2 text-sm font-mono text-foreground bg-secondary/30 px-3 py-1.5 rounded-lg"
                        >
                          <Terminal className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <code className="flex-1">{example}</code>
                          <CopyButton text={example} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Options */}
                {cmd.options && cmd.options.length > 0 && (
                  <div className="ml-14">
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                      Options
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cmd.options.map((opt) => (
                        <span
                          key={opt.flag}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono bg-secondary text-secondary-foreground"
                        >
                          <span className="text-primary">{opt.flag}</span>
                          <span className="text-muted-foreground">- {opt.desc}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subcommands */}
                {cmd.subcommands && cmd.subcommands.length > 0 && (
                  <div className="ml-14">
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                      Subcommands
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {cmd.subcommands.map((sub) => (
                        <div
                          key={sub.cmd}
                          className="flex items-center gap-2 text-sm"
                        >
                          <ChevronRight className="w-4 h-4 text-primary" />
                          <code className="font-mono text-foreground">{sub.cmd}</code>
                          <span className="text-muted-foreground">- {sub.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Options */}
      <section className="py-20 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Global <span className="gradient-text">Options</span>
            </h2>
          </motion.div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { flag: "--help, -h", desc: "Show help for a command" },
                { flag: "--version, -V", desc: "Show version number" },
                { flag: "--verbose, -v", desc: "Enable verbose output" },
                { flag: "--dry-run", desc: "Preview changes without writing" },
                { flag: "--quiet, -q", desc: "Suppress output except errors" },
                { flag: "--cwd <dir>", desc: "Working directory" },
                { flag: "--config <file>", desc: "Config file path" },
                { flag: "--no-color", desc: "Disable colored output" },
              ].map((opt) => (
                <div key={opt.flag} className="flex items-start gap-3">
                  <code className="font-mono text-primary text-sm bg-primary/10 px-2 py-0.5 rounded">
                    {opt.flag}
                  </code>
                  <span className="text-muted-foreground text-sm">{opt.desc}</span>
                </div>
              ))}
            </div>
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
            <h2 className="text-2xl font-bold mb-4">Ready to Build?</h2>
            <p className="text-muted-foreground mb-6">
              Start building your backend with the powerful ServCraft CLI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/quickstart">
                <Button size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Quick Start
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="outline" size="lg">
                  Read Documentation
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
