"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Settings,
  ChevronRight,
  Database,
  Shield,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Info,
  Copy,
  Lock,
  Zap,
  Server,
  Bell
} from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

const configSections = [
  {
    category: "Core",
    icon: Settings,
    description: "Essential project configuration",
    options: [
      { key: "name", type: "string", desc: "Project name used for identification", default: "my-app" },
      { key: "version", type: "string", desc: "Semantic version of your application", default: "1.0.0" },
      { key: "description", type: "string", desc: "Brief description of your project", default: "" },
    ],
  },
  {
    category: "ServCraft",
    icon: Zap,
    description: "ServCraft framework settings",
    options: [
      { key: "servcraft.language", type: "enum", desc: "Programming language: typescript or javascript", default: "typescript" },
      { key: "servcraft.moduleSystem", type: "enum", desc: "ESM (ES Modules) or CommonJS", default: "esm" },
      { key: "servcraft.validator", type: "enum", desc: "Validation library: zod, joi, yup", default: "zod" },
    ],
  },
  {
    category: "Database",
    icon: Database,
    description: "Database connection and ORM settings",
    options: [
      { key: "servcraft.database.provider", type: "enum", desc: "Database engine", default: "postgresql" },
      { key: "servcraft.database.schema", type: "string", desc: "Path to Prisma schema file", default: "prisma/schema.prisma" },
    ],
  },
];

const fullConfigExample = `{
  "name": "my-api",
  "version": "1.0.0",
  "servcraft": {
    "version": ">=0.4.0",
    "language": "typescript",
    "modules": ["auth", "users", "email"],
    "moduleSystem": "esm",
    "database": {
      "provider": "postgresql",
      "schema": "prisma/schema.prisma"
    }
  }
}`;

const envExample = `# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# JWT Authentication
JWT_ACCESS_SECRET=your-super-secret-key`;

const environmentInfo = [
  { icon: CheckCircle2, title: "Development", desc: "Use .env for local overrides", color: "text-green-500" },
  { icon: Server, title: "Production", desc: "Use environment variables", color: "text-red-500" },
  { icon: AlertTriangle, title: "Security", desc: "Never commit .env files", color: "text-orange-500" },
  { icon: Lock, title: "Secrets", desc: "Keep passwords out of code", color: "text-blue-500" },
];

export function ConfigurationPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-20 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  Project <span className="gradient-text">Configuration</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Configure your ServCraft project for any environment
                </p>
              </div>
            </div>

            <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
              ServCraft uses a centralized configuration file (`servcraft.config.json`) and
              environment variables to manage all project settings.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Configuration Sections */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Configuration <span className="gradient-text">Options</span>
            </h2>
          </motion.div>

          {configSections.map((section, catIndex) => (
            <motion.div
              key={section.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: catIndex * 0.1 }}
              className="p-6 rounded-xl bg-card border border-border mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{section.category}</h3>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2">Key</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Description</th>
                      <th className="text-left py-2">Default</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.options.map((opt) => (
                      <tr key={opt.key} className="border-b border-border/50">
                        <td className="py-2">
                          <code className="text-primary text-xs">{opt.key}</code>
                        </td>
                        <td className="py-2">{opt.type}</td>
                        <td className="py-2 text-muted-foreground">{opt.desc}</td>
                        <td className="py-2">{opt.default}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Environment Variables */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Environment Variables</h2>
              <p className="text-muted-foreground mb-6">
                Store sensitive configuration and environment-specific values in `.env` files.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {environmentInfo.map((info) => (
                  <div key={info.title} className="p-4 rounded-lg bg-card border border-border">
                    <info.icon className={cn("w-5 h-5 mb-2", info.color)} />
                    <h3 className="font-semibold text-sm">{info.title}</h3>
                    <p className="text-xs text-muted-foreground">{info.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <CodeBlock
              code={envExample}
              title=".env.example"
            />
          </div>
        </div>
      </section>

      {/* Complete Example */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Complete Example</h2>
          <CodeBlock
            code={fullConfigExample}
            title="servcraft.config.json"
          />
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link href="/docs/architecture">
            <Button size="lg">Learn Architecture</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
