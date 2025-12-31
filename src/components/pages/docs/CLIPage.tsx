"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Terminal,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/Button";

const cliSections = [
  {
    category: "Project Management",
    commands: [
      {
        cmd: "servcraft init <name>",
        desc: "Initialize a new ServCraft project",
      },
      {
        cmd: "servcraft doctor",
        desc: "Diagnose project configuration",
      },
    ],
  },
  {
    category: "Module Management",
    commands: [
      {
        cmd: "servcraft add <module>",
        desc: "Add a pre-built module",
      },
      {
        cmd: "servcraft list",
        desc: "List available modules",
      },
    ],
  },
  {
    category: "Code Generation",
    commands: [
      {
        cmd: "servcraft generate <type> <name>",
        desc: "Generate controllers, services, or schemas",
      },
      {
        cmd: "servcraft scaffold <name>",
        desc: "Generate complete CRUD for a resource",
      },
    ],
  },
];

export function CLIPage() {
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

      {/* Commands by Category */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {cliSections.map((section) => (
              <div key={section.category}>
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  {section.category}
                </h3>
                <div className="space-y-4">
                  {section.commands.map((cmd) => (
                    <div key={cmd.cmd} className="p-4 rounded-lg bg-card border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Terminal className="w-4 h-4 text-primary" />
                        <code className="font-mono text-sm">{cmd.cmd}</code>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">
                        {cmd.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Examples */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center text-center">Common Examples</h2>
          <CodeBlock
            code={`servcraft init my-api --ts --prisma postgres
servcraft add auth users email
servcraft scaffold blog --with-tests`}
            title="Common CLI Examples"
          />
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-center">
          <Link href="/docs/api">
            <Button size="lg">View API Reference</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
