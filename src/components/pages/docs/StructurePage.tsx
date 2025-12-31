"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  FolderTree,
  FileCode,
  Box,
  FileText,
  Shield,
  ChevronRight,
  Terminal,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/Button";

const directoryStructure = {
  name: "my-app/",
  type: "folder",
  children: [
    {
      name: "src/",
      type: "folder",
      description: "Main source directory containing all application code",
      children: [
        {
          name: "modules/",
          type: "folder",
          description: "Feature modules (auth, users, email, etc.)",
          children: [
            { name: "auth/", type: "folder" },
            { name: "users/", type: "folder" },
            { name: "email/", type: "folder" },
            { name: "*.ts", type: "file", color: "text-blue-400" },
          ],
        },
        {
          name: "controllers/",
          type: "folder",
          description: "HTTP request handlers",
        },
        {
          name: "services/",
          type: "folder",
          description: "Business logic and data operations",
        },
        {
          name: "schemas/",
          type: "folder",
          description: "Zod validation schemas and DTOs",
        },
        { name: "app.ts", type: "file", color: "text-blue-400" },
        { name: "server.ts", type: "file", color: "text-blue-400" },
      ],
    },
    {
      name: "prisma/",
      type: "folder",
      description: "Database schema and migrations",
    },
    { name: ".env", type: "file", color: "text-green-400" },
    { name: "package.json", type: "file", color: "text-yellow-400" },
    { name: "servcraft.config.json", type: "file", color: "text-blue-400" },
  ],
};

const keyFiles = [
  {
    file: "src/app.ts",
    description: "Main application configuration with Fastify instance, plugins, and route registration",
    responsibilities: ["Initialize Fastify", "Register plugins", "Register routes", "Configure CORS"],
  },
  {
    file: "src/server.ts",
    description: "Server entry point that starts the HTTP server and handles graceful shutdown",
    responsibilities: ["Start server", "Listen on port", "Handle shutdown signals", "Log server status"],
  },
  {
    file: "src/modules/*/",
    description: "Feature modules containing controllers, services, and schemas for specific functionality",
    responsibilities: ["Encapsulate feature logic", "Expose public API", "Handle dependencies"],
  },
  {
    file: "prisma/schema.prisma",
    description: "Database schema defining all models, relations, and constraints for Prisma ORM",
    responsibilities: ["Define data models", "Set up relationships", "Configure indexes", "Generate migrations"],
  },
  {
    file: "servcraft.config.json",
    description: "Project configuration file specifying ServCraft settings, modules, and database options",
    responsibilities: ["Project metadata", "Module configuration", "Database settings", "Build scripts"],
  },
];

const conventions = [
  {
    title: "File Naming",
    description: "Use kebab-case for files (e.g., user-controller.ts, auth-service.ts). This follows Node.js conventions and improves readability across different operating systems.",
  },
  {
    title: "Class Naming",
    description: "Use PascalCase for classes and constructors (e.g., UserController, AuthService, DatabaseProvider). This makes class declarations easily identifiable.",
  },
  {
    title: "Module Structure",
    description: "Each module should follow the pattern: controller handles HTTP, service handles business logic, schema handles validation. Keep concerns separated.",
  },
  {
    title: "Export Pattern",
    description: "Export main classes/functions from index.ts files to provide a clean public API. Avoid barrel files that export everything indiscriminately.",
  },
  {
    title: "Error Handling",
    description: "Use the HttpError class from utils/errors.ts for API errors. This provides consistent error responses with proper HTTP status codes.",
  },
  {
    title: "Configuration",
    description: "Store configuration in .env files and access via process.env. Use Zod schemas to validate configuration at startup.",
  },
];

const moduleStructureExample = `src/modules/auth/
├── index.ts          # Exports public API
├── controller.ts     # HTTP request handlers
├── service.ts        # Business logic
├── schema.ts         # Zod validation schemas
├── middleware.ts     # Auth-specific middleware
├── routes.ts         # Route definitions
└── README.md         # Module documentation`;

const bestPractices = [
  { icon: CheckCircle2, title: "Single Responsibility", desc: "Each file should have one clear purpose" },
  { icon: CheckCircle2, title: "Dependency Injection", desc: "Pass dependencies as constructor parameters" },
  { icon: CheckCircle2, title: "Error Boundaries", desc: "Handle errors at the appropriate level" },
  { icon: CheckCircle2, title: "Type Safety", desc: "Use TypeScript for all new code" },
  { icon: CheckCircle2, title: "Testing", desc: "Write tests for controllers and services" },
  { icon: CheckCircle2, title: "Documentation", desc: "Document public APIs with JSDoc" },
];

function FileTree({ items, depth = 0 }: { items: any[]; depth?: number }) {
  return (
    <div className="font-mono text-sm">
      {items.map((item, index) => (
        <div key={index} className="flex items-start flex-col">
          <div
            style={{ paddingLeft: depth * 20 + "px" }}
            className="flex items-center gap-2 py-0.5"
          >
            {item.type === "folder" ? (
              <FolderTree className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            ) : (
              <FileCode className="w-4 h-4 flex-shrink-0" style={{ color: item.color }} />
            )}
            <span style={{ color: item.type === "folder" ? undefined : item.color }}>
              {item.name}
            </span>
          </div>
          {item.children && <FileTree items={item.children} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}

export function StructurePage() {
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
                <FolderTree className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  Project <span className="gradient-text">Structure</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Understand the generated project structure and conventions
                </p>
              </div>
            </div>

            <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
              ServCraft generates a well-organized project structure following industry best practices.
              This guide explains each directory, file, and the conventions you should follow.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Directory Structure Overview */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Directory <span className="gradient-text">Overview</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete view of your project structure with explanations for each directory and file
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Tree View */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-xl bg-[#0d0d14] border border-border overflow-x-auto"
            >
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                <Terminal className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Project Structure</span>
              </div>
              <FileTree items={directoryStructure.children} />
            </motion.div>

            {/* Key Files */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary" />
                Key Files
              </h3>
              <div className="space-y-4">
                {keyFiles.map((file, index) => (
                  <motion.div
                    key={file.file}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg bg-card border border-border"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileCode className="w-4 h-4 text-primary" />
                      <code className="text-sm font-mono text-primary">
                        {file.file}
                      </code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {file.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {file.responsibilities.map((resp) => (
                        <span
                          key={resp}
                          className="px-2 py-0.5 text-xs rounded bg-secondary text-secondary-foreground"
                        >
                          {resp}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Module Structure Deep Dive */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Module <span className="gradient-text">Structure</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each feature module follows a consistent structure for maintainability
            </p>
          </motion.div>

          <CodeBlock
            code={moduleStructureExample}
            title="src/modules/auth/"
            showLineNumbers={true}
          />

          <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "controller.ts", desc: "Handles HTTP requests, validates input, returns responses" },
              { name: "service.ts", desc: "Contains business logic, interacts with database" },
              { name: "schema.ts", desc: "Defines Zod validation schemas for request/response" },
              { name: "middleware.ts", desc: "Module-specific middleware functions" },
              { name: "routes.ts", desc: "Route definitions and middleware composition" },
              { name: "index.ts", desc: "Exports public API for the module" },
            ].map((file, index) => (
              <motion.div
                key={file.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg bg-card border border-border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="w-4 h-4 text-primary" />
                  <code className="text-sm font-mono text-primary">{file.name}</code>
                </div>
                <p className="text-sm text-muted-foreground">{file.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Conventions */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Naming <span className="gradient-text">Conventions</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Follow these conventions for consistent and maintainable code across your project
            </p>
          </motion.div>

          <div className="grid gap-4">
            {conventions.map((convention, index) => (
              <motion.div
                key={convention.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{convention.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {convention.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Best Practices */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Best <span className="gradient-text">Practices</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Guidelines for writing clean, maintainable code with ServCraft
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bestPractices.map((practice, index) => (
              <motion.div
                key={practice.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <practice.icon className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold">{practice.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{practice.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Configuration File */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Configuration <span className="gradient-text">File</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The servcraft.config.json file contains all project settings
            </p>
          </motion.div>

          <CodeBlock
            code={`{
  "name": "my-app",
  "version": "1.0.0",
  "servcraft": {
    "version": "0.4.9",
    "language": "typescript",
    "modules": ["auth", "users", "email"],
    "database": {
      "provider": "postgresql",
      "schema": "prisma/schema.prisma"
    },
    "validator": "zod",
    "moduleSystem": "esm"
  },
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "test": "vitest"
  }
}`}
            title="servcraft.config.json"
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
            <p className="text-muted-foreground mb-8">
              Now that you understand the structure, start adding modules and features.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/docs/architecture">
                <Button rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Learn Architecture
                </Button>
              </Link>
              <Link href="/docs/getting-started">
                <Button variant="outline">Back to Getting Started</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
