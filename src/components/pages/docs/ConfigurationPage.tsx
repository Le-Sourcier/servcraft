"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Settings,
  Database,
  Shield,
  Zap,
  Lock,
  Server,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Info,
  Terminal,
  Code2
} from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/Button";

const configSections = [
  {
    category: "Framework Core",
    icon: Zap,
    description: "Fundamental settings that define how ServCraft operates.",
    options: [
      { key: "servcraft.language", type: "typescript | javascript", desc: "Sets the target language for code generation." },
      { key: "servcraft.moduleSystem", type: "esm | cjs", desc: "Determines if your project uses ES Modules (.js) or CommonJS." },
      { key: "servcraft.validator", type: "zod | joi | yup", desc: "The library used for incoming request validation." },
    ],
  },
  {
    category: "Database Infrastructure",
    icon: Database,
    description: "Connectivity and schema settings for the data layer.",
    options: [
      { key: "servcraft.database.provider", type: "string", desc: "postgresql, mysql, sqlite, or mongodb." },
      { key: "servcraft.database.schema", type: "path", desc: "Relative path to your Prisma schema file." },
    ],
  },
];

const envVariables = [
  { name: "PORT", desc: "The port the Fastify server will listen on.", default: "3000" },
  { name: "NODE_ENV", desc: "development, testing, or production.", default: "development" },
  { name: "DATABASE_URL", desc: "Connection string for your chosen database provider.", required: true },
  { name: "JWT_ACCESS_SECRET", desc: "Secure key for signing Access Tokens.", required: true },
];

const fullConfig = `{
  "name": "my-backend-api",
  "servcraft": {
    "version": "0.4.9",
    "language": "typescript",
    "modules": ["auth", "users", "email", "cache"],
    "database": {
      "provider": "postgresql",
      "schema": "prisma/schema.prisma"
    },
    "validator": "zod",
    "moduleSystem": "esm"
  }
}`;

export function ConfigurationPage() {
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
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  Project <span className="gradient-text">Configuration</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Fine-tune your ServCraft environment and project settings
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Intro Table */}
      <section className="py-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-white mb-4">Centeralized Control</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                ServCraft uses a dual-layer configuration system. Static project settings reside in
                <code className="text-primary mx-1">servcraft.config.json</code>, while environment-specific
                secrets and overrides are handled via <code className="text-primary mx-1">.env</code> files.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <p className="text-xs text-amber-200/70Leading-relaxed">
                  <strong>Security Note:</strong> Always add <code className="text-amber-500">.env</code> to your
                  <code className="text-amber-500">.gitignore</code>. Use environment variables in production CI/CD
                  platforms instead of raw files.
                </p>
              </div>
            </div>
            <div className="space-y-4">
               <div className="p-4 rounded-xl bg-card border border-border">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Validation
                  </h4>
                  <p className="text-xs text-muted-foreground">Config is validated at startup to ensure the server starts with correct parameters.</p>
               </div>
               <div className="p-4 rounded-xl bg-card border border-border">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                    <RefreshCw className="w-4 h-4 text-blue-500" /> Hot Reload
                  </h4>
                  <p className="text-xs text-muted-foreground">Development environment automatically detects changes in your config files.</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* JSON Config Reference */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">JSON Config Reference</h2>
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-12">
              {configSections.map((section) => (
                <div key={section.category}>
                  <div className="flex items-center gap-3 mb-6">
                    <section.icon className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold">{section.category}</h3>
                  </div>
                  <div className="space-y-6">
                    {section.options.map(opt => (
                      <div key={opt.key} className="border-l-2 border-primary/20 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-bold text-primary">{opt.key}</code>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">{opt.type}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{opt.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <CodeBlock
                code={fullConfig}
                title="servcraft.config.json"
                showLineNumbers={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Environment Variables */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2">Environment Variables</h2>
            <p className="text-muted-foreground">Standardized variables used by the framework core.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {envVariables.map(v => (
              <div key={v.name} className="p-5 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-bold text-white">{v.name}</code>
                  {v.required && <span className="text-[10px] text-red-400 font-bold uppercase">Required</span>}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
                {v.default && <div className="mt-2 text-[10px] text-primary">Default: {v.default}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 text-center">
        <Link href="/docs/architecture">
          <Button size="lg">Explore Architecture</Button>
        </Link>
      </section>
    </div>
  );
}
