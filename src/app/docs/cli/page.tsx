"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Terminal,
  ChevronRight,
  Box,
  Layers,
  FileCode,
  Trash2,
  RefreshCw,
  Stethoscope,
  Sparkles,
  BookOpen,
  Database,
  Settings,
  Copy,
  Check
} from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/Button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const cliSections = [
  {
    category: "Project Management",
    commands: [
      {
        cmd: "servcraft init <name>",
        desc: "Initialize a new ServCraft project",
        options: [
          { flag: "--ts", desc: "Use TypeScript (default)" },
          { flag: "--js", desc: "Use JavaScript" },
          { flag: "--prisma <db>", desc: "Database: postgres, mysql, sqlite, mongodb" },
          { flag: "--validator <lib>", desc: "Validator: zod, joi, yup" },
          { flag: "--esm", desc: "Use ESM modules" },
          { flag: "--template <name>", desc: "Project template" },
        ],
      },
      {
        cmd: "servcraft doctor",
        desc: "Diagnose project configuration",
        options: [
          { flag: "--fix", desc: "Auto-fix common issues" },
          { flag: "--verbose", desc: "Show detailed output" },
        ],
      },
      {
        cmd: "servcraft update",
        desc: "Update ServCraft and modules",
        options: [
          { flag: "--modules-only", desc: "Update only modules" },
          { flag: "--dry-run", desc: "Preview changes" },
        ],
      },
    ],
  },
  {
    category: "Module Management",
    commands: [
      {
        cmd: "servcraft add <module>",
        desc: "Add a pre-built module",
        options: [
          { flag: "--crud", desc: "Generate CRUD" },
          { flag: "--dry-run", desc: "Preview changes" },
        ],
      },
      {
        cmd: "servcraft remove <module>",
        desc: "Remove a module",
        options: [
          { flag: "--keep-files", desc: "Keep generated files" },
        ],
      },
      {
        cmd: "servcraft list",
        desc: "List available/installed modules",
        options: [
          { flag: "--available", desc: "Show available modules" },
          { flag: "--installed", desc: "Show installed modules" },
        ],
      },
    ],
  },
  {
    category: "Code Generation",
    commands: [
      {
        cmd: "servcraft generate <type> <name>",
        desc: "Generate code for controllers, services, or schemas",
        options: [
          { flag: "--with-tests", desc: "Generate test files" },
          { flag: "--dry-run", desc: "Preview changes" },
        ],
      },
      {
        cmd: "servcraft scaffold <name>",
        desc: "Generate complete CRUD for a resource",
        options: [
          { flag: "--with-tests", desc: "Generate test files" },
          { flag: "--dry-run", desc: "Preview changes" },
        ],
      },
      {
        cmd: "servcraft templates",
        desc: "Manage custom code templates",
        options: [],
        subcommands: ["list", "add", "remove", "edit"],
      },
    ],
  },
  {
    category: "Database",
    commands: [
      {
        cmd: "servcraft db migrate",
        desc: "Run Prisma migrations",
        options: [],
      },
      {
        cmd: "servcraft db push",
        desc: "Push schema changes",
        options: [],
      },
      {
        cmd: "servcraft db generate",
        desc: "Generate Prisma client",
        options: [],
      },
      {
        cmd: "servcraft db seed",
        desc: "Run database seeders",
        options: [],
      },
      {
        cmd: "servcraft db studio",
        desc: "Open Prisma Studio",
        options: [],
      },
    ],
  },
  {
    category: "Documentation",
    commands: [
      {
        cmd: "servcraft docs generate",
        desc: "Generate API documentation",
        options: [
          { flag: "--output <path>", desc: "Output file path" },
        ],
      },
      {
        cmd: "servcraft docs export",
        desc: "Export docs to Postman/Insomnia",
        options: [
          { flag: "--format <fmt>", desc: "Format: postman, insomnia, yaml" },
        ],
      },
      {
        cmd: "servcraft docs status",
        desc: "Show documentation status",
        options: [],
      },
    ],
  },
  {
    category: "Utilities",
    commands: [
      {
        cmd: "servcraft completion",
        desc: "Generate shell completion",
        options: [],
        subcommands: ["bash", "zsh", "fish"],
      },
      {
        cmd: "servcraft --version",
        desc: "Show version",
        options: [],
      },
      {
        cmd: "servcraft --help",
        desc: "Show help",
        options: [],
      },
    ],
  },
];

const globalOptions = [
  { flag: "--help, -h", desc: "Show help for a command" },
  { flag: "--version, -V", desc: "Show version number" },
  { flag: "--verbose, -v", desc: "Enable verbose output" },
  { flag: "--dry-run", desc: "Preview changes without writing" },
  { flag: "--quiet, -q", desc: "Suppress output except errors" },
  { flag: "--cwd <dir>", desc: "Working directory" },
  { flag: "--config <file>", desc: "Config file path" },
  { flag: "--no-color", desc: "Disable colored output" },
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

export default function CLIPage() {
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
                <Terminal className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  CLI <span className="gradient-text">Reference</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Complete reference for all CLI commands and options
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Global Options */}
      <section className="py-16">
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

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="grid sm:grid-cols-2 gap-4">
              {globalOptions.map((opt) => (
                <div key={opt.flag} className="flex items-start gap-3">
                  <code className="font-mono text-sm bg-secondary px-2 py-0.5 rounded flex-shrink-0 text-primary">
                    {opt.flag}
                  </code>
                  <span className="text-sm text-muted-foreground">{opt.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Commands by Category */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Commands by <span className="gradient-text">Category</span>
            </h2>
          </motion.div>

          <div className="space-y-12">
            {cliSections.map((section, sectionIndex) => (
              <motion.div
                key={section.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: sectionIndex * 0.1 }}
              >
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  {section.category}
                </h3>
                <div className="space-y-4">
                  {section.commands.map((cmd, cmdIndex) => (
                    <div
                      key={cmd.cmd}
                      className="p-4 rounded-lg bg-card border border-border"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Terminal className="w-4 h-4 text-primary" />
                        <code className="font-mono text-sm text-foreground">
                          {cmd.cmd}
                        </code>
                        <CopyButton text={cmd.cmd} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 ml-6">
                        {cmd.desc}
                      </p>

                      {/* Options */}
                      {cmd.options && cmd.options.length > 0 && (
                        <div className="ml-6 flex flex-wrap gap-2">
                          {cmd.options.map((opt) => (
                            <span
                              key={opt.flag}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-secondary text-secondary-foreground"
                            >
                              <span className="text-primary">{opt.flag}</span>
                              <span className="text-muted-foreground">- {opt.desc}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Subcommands */}
                      {cmd.subcommands && cmd.subcommands.length > 0 && (
                        <div className="ml-6 mt-2">
                          <span className="text-xs text-muted-foreground">Subcommands: </span>
                          {cmd.subcommands.map((sub) => (
                            <code
                              key={sub}
                              className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded mx-1"
                            >
                              {sub}
                            </code>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Examples */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Common <span className="gradient-text">Examples</span>
            </h2>
          </motion.div>

          <CodeBlock
            code={`# Create a new TypeScript project with PostgreSQL
servcraft init my-api --ts --prisma postgres

# Add multiple modules at once
servcraft add auth users email cache

# Generate a resource with tests
servcraft scaffold blog --with-tests

# Generate just a controller
servcraft generate controller post

# Update to latest version
servcraft update

# Check project health
servcraft doctor --fix

# Generate API docs
servcraft docs generate --output ./docs/openapi.json

# Export to Postman collection
servcraft docs export --format postman`}
            title="Common CLI Examples"
            showLineNumbers={false}
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
              <Link href="/docs/api">
                <Button rightIcon={<ChevronRight className="w-4 h-4" />}>
                  API Reference
                </Button>
              </Link>
              <Link href="/docs/auth">
                <Button variant="outline">Back to Authentication</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
