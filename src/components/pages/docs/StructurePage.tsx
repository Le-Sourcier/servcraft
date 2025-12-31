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
  CheckCircle2,
  Database,
  Search,
  Code2,
  FileBox,
  Braces,
  GitBranch,
  Layers,
  X as X,
  FileJson,
  FileEdit,
  HardDrive,
  Zap,
  Code,
  Lock,
  Settings,
  TestTube,
  Play,
  Building,
  GitPullRequest,
  Eye,
  EyeOff,
  Copy
} from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/Button";

const keyDirectories = [
  {
    name: "src/modules",
    icon: FileBox,
    desc: "The core of your application. Contains feature-based modules (auth, users, etc.) each with its own logic.",
    items: ["Controllers", "Services", "Schemas", "Routes", "Middleware"]
  },
  {
    name: "src/utils",
    icon: Layers,
    desc: "Global helper functions, custom error classes, and shared constants used across the app.",
    items: ["HTTP Errors", "Date Helpers", "Logger Config", "String Utils"]
  },
  {
    name: "prisma/",
    icon: Database,
    desc: "Database schema definitions and migration history managed by Prisma ORM.",
    items: ["schema.prisma", "migrations/", "seed.ts"]
  },
  {
    name: "src/config/",
    icon: Settings,
    desc: "Configuration files for environment variables, database connections, and app settings.",
    items: ["env.ts", "database.ts", "app.ts"]
  },
  {
    name: "src/types/",
    icon: Braces,
    desc: "Shared TypeScript types and interfaces used across the application.",
    items: ["global.d.ts", "express.d.ts", "api.types.ts"]
  },
  {
    name: "__tests__/",
    icon: TestTube,
    desc: "Test files organized by structure (unit, integration, e2e).",
    items: ["unit/", "integration/", "e2e/"]
  },
];

const fileConventions = [
  { file: "*.controller.ts", desc: "Handles incoming HTTP requests and returns responses.", color: "text-blue-400", icon: Zap },
  { file: "*.service.ts", desc: "Encapsulates business logic and database interactions.", color: "text-purple-400", icon: Code },
  { file: "*.schema.ts", desc: "Defines Zod/Joi validation for request bodies and params.", color: "text-green-400", icon: Shield },
  { file: "*.routes.ts", desc: "Registers endpoints and attaches specific middleware.", color: "text-orange-400", icon: GitBranch },
  { file: "*.middleware.ts", desc: "Pre/post-request handlers for auth, validation, etc.", color: "text-pink-400", icon: Lock },
  { file: "*.utils.ts", desc: "Pure functions and helpers without side effects.", color: "text-cyan-400", icon: Eye },
  { file: "*.types.ts", desc: "TypeScript type definitions and interfaces.", color: "text-yellow-400", icon: Braces },
];

const moduleStructure = `// src/modules/auth/ - Example Module Structure
auth/
├── index.ts              # Public API of the module
├── controller.ts         # HTTP request handlers
├── service.ts            # Business logic layer
├── schema.ts             # Zod validation schemas
├── middleware.ts          # Route-level middleware
├── routes.ts             # Route definitions
├── types.ts              # Module-specific types
├── errors.ts             # Custom error classes
└── validators.ts         # Additional validation logic

// Each module is self-contained
// Can be added/removed independently
// Public interface defined in index.ts`;

const indexPatternExample = `// src/modules/auth/index.ts
// Export only what's necessary - control public API

// Controllers and Routes
export { authController } from './controller';
export { authRoutes } from './routes';

// Middleware (for use in other modules)
export { authenticate } from './middleware';
export { requirePermission } from './middleware';

// Schemas (for shared validation)
export { loginSchema, registerSchema } from './schema';

// Types (for type reuse)
export type { AuthUser, LoginInput, RegisterInput } from './types';

// Services (often kept private within module)
// export { authService } from './service'; // If needed by other modules

// DO NOT export:
// - Internal helper functions
// - Implementation details
// - Temporary workarounds`;

const utilsStructure = `// src/utils/ - Shared Utilities

// HTTP Helpers
export function successResponse(data: any, meta?: any) {
  return { success: true, data, ...meta };
}

export function errorResponse(message: string, code: number) {
  return { success: false, error: message, code };
}

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
  }
}

// Date Helpers
export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);

export const isExpired = (date: Date) =>
  date < new Date();

// String Helpers
export const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// Validation Helpers
export const isValidEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}`;

export function StructurePage() {
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
                <FolderTree className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  Project <span className="gradient-text">Structure</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  A guided tour through the ServCraft codebase organization
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">Logical Organization</h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  ServCraft follows a **Module-First** architecture. Instead of separating files by type (controllers/ vs models/), we group them by feature.
                  This dramatically improves maintainability as your project grows.
                </p>
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h4 className="text-base font-bold text-white mb-1">Feature Cohesion</h4>
                      <p className="text-sm text-muted-foreground">All files for a feature live together</p>
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h4 className="text-base font-bold text-white mb-1">Easy Navigation</h4>
                      <p className="text-sm text-muted-foreground">Find related code quickly</p>
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h4 className="text-base font-bold text-white mb-1">Independent Modules</h4>
                      <p className="text-sm text-muted-foreground">Swap/modify without side effects</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative group">
                 <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full opacity-50" />
                 <div className="relative rounded-3xl bg-[#0a0a0f] border border-white/10 p-6 shadow-2xl">
                    <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                       <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                       </div>
                       <span className="text-[10px] text-muted-foreground font-mono ml-2 uppercase tracking-widest">Workspace Explorer</span>
                    </div>

                    <div className="font-mono text-xs space-y-2.5 leading-relaxed">
                       <div className="flex items-center gap-2 text-yellow-500/80"><FolderTree className="w-3.5 h-3.5" /> my-api/</div>
                       <div className="ml-4 flex items-center gap-2 text-yellow-500/60"><FolderTree className="w-3.5 h-3.5" /> src/</div>
                       <div className="ml-8 flex items-center gap-2 text-yellow-500/60"><FolderTree className="w-3.5 h-3.5" /> modules/</div>
                       <div className="ml-12 flex items-center gap-2 text-yellow-500/40"><FolderTree className="w-3.5 h-3.5" /> auth/</div>
                       <div className="ml-16 flex items-center gap-2 text-blue-400/70"><FileCode className="w-3.5 h-3.5" /> controller.ts</div>
                       <div className="ml-16 flex items-center gap-2 text-purple-400/70"><FileCode className="w-3.5 h-3.5" /> service.ts</div>
                       <div className="ml-16 flex items-center gap-2 text-green-400/70"><FileCode className="w-3.5 h-3.5" /> schema.ts</div>
                       <div className="ml-16 flex items-center gap-2 text-green-400/70"><FileCode className="w-3.5 h-3.5" /> routes.ts</div>
                       <div className="ml-16 flex items-center gap-2 text-green-400/70"><FileCode className="w-3.5 h-3.5" /> middleware.ts</div>
                       <div className="ml-16 flex items-center gap-2 text-green-400/70"><FileCode className="w-3.5 h-3.5" /> index.ts</div>
                       <div className="ml-12 flex items-center gap-2 text-yellow-500/40"><FolderTree className="w-3.5 h-3.5" /> users/</div>
                       <div className="ml-12 flex items-center gap-2 text-blue-400/70"><FileCode className="w-3.5 h-3.5" /> controller.ts</div>
                       <div className="ml-12 flex items-center gap-2 text-purple-400/70"><FileCode className="w-3.5 h-3.5" /> service.ts</div>
                       <div className="ml-12 flex items-center gap-2 text-yellow-500/40"><FolderTree className="w-3.5 h-3.5" /> posts/</div>
                       <div className="ml-8 flex items-center gap-2 text-yellow-500/60"><FolderTree className="w-3.5 h-3.5" /> utils/</div>
                       <div className="ml-12 flex items-center gap-2 text-blue-400/70"><FileCode className="w-3.5 h-3.5" /> errors.ts</div>
                       <div className="ml-12 flex items-center gap-2 text-blue-400/70"><FileCode className="w-3.5 h-3.5" /> date.ts</div>
                       <div className="ml-8 flex items-center gap-2 text-yellow-500/60"><FolderTree className="w-3.5 h-3.5" /> config/</div>
                       <div className="ml-12 flex items-center gap-2 text-blue-400/70"><FileCode className="w-3.5 h-3.5" /> env.ts</div>
                       <div className="ml-12 flex items-center gap-2 text-purple-400/70"><FileCode className="w-3.5 h-3.5" /> database.ts</div>
                       <div className="ml-4 flex items-center gap-2 text-orange-400/60"><FolderTree className="w-3.5 h-3.5" /> prisma/</div>
                       <div className="ml-12 flex items-center gap-2 text-green-400/70"><FileCode className="w-3.5 h-3.5" /> schema.prisma</div>
                       <div className="ml-12 flex items-center gap-2 text-blue-400/70"><FileCode className="w-3.5 h-3.5" /> seed.ts</div>
                       <div className="ml-4 flex items-center gap-2 text-yellow-500/60"><FolderTree className="w-3.5 h-3.5" /> __tests__/</div>
                       <div className="ml-8 flex items-center gap-2 text-yellow-500/40"><FolderTree className="w-3.5 h-3.5" /> unit/</div>
                       <div className="ml-12 flex items-center gap-2 text-blue-400/70"><FileCode className="w-3.5 h-3.5" /> auth.test.ts</div>
                       <div className="ml-4 flex items-center gap-2 text-yellow-500/60"><FolderTree className="w-3.5 h-3.5" /> .env</div>
                       <div className="ml-4 flex items-center gap-2 text-orange-400/60"><FileJson className="w-3.5 h-3.5" /> package.json</div>
                       <div className="ml-4 flex items-center gap-2 text-orange-400/60"><FileJson className="w-3.5 h-3.5" /> tsconfig.json</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Key Directories */}
      <section className="py-16 bg-secondary/5">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-8 text-center">Key Directories</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
               {keyDirectories.map(dir => (
                 <div key={dir.name} className="p-6 rounded-2xl bg-card border border-border flex flex-col h-full hover:border-primary/30 transition-all">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mb-4">
                      <dir.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1 font-mono">{dir.name}</h4>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed flex-1">{dir.desc}</p>
                    <div className="pt-4 border-t border-white/5">
                       <div className="flex flex-wrap gap-2">
                          {dir.items.map(i => (
                             <span key={i} className="text-[9px] uppercase font-bold tracking-wider text-primary/60 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{i}</span>
                          ))}
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* File Naming Conventions */}
      <section className="py-16">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-4">File Naming Conventions</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Consistent naming helps maintain code clarity and improves IDE autocomplete.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {fileConventions.map(conv => (
                 <div key={conv.file} className="p-6 rounded-2xl bg-card border border-border">
                    <div className="flex items-center gap-2 mb-3">
                       <conv.icon className={`w-5 h-5 ${conv.color}`} />
                       <code className={`text-sm font-bold block ${conv.color}`}>{conv.file}</code>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{conv.desc}</p>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* Module Pattern */}
      <section className="py-16 bg-secondary/5">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
               <div>
                  <h2 className="text-3xl font-bold mb-6">The Module Pattern</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                    Every module uses an <code className="text-primary">index.ts</code> to control its public interface.
                    This creates a clean boundary between modules while enabling code reuse.
                  </p>
                  <div className="space-y-4">
                     <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-sm font-bold text-primary mb-1">Encapsulation</h4>
                        <p className="text-xs text-muted-foreground">Hide internal details, expose only API</p>
                     </div>
                     <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-sm font-bold text-primary mb-1">Import Ease</h4>
                        <p className="text-xs text-muted-foreground">Single import path: <code className="text-primary">import {'{X}'} from '@/modules/x'</code></p>
                     </div>
                     <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-sm font-bold text-primary mb-1">Explicit Exports</h4>
                        <p className="text-xs text-muted-foreground">See exactly what's public at a glance</p>
                     </div>
                  </div>
               </div>
               <CodeBlock
                 code={moduleStructure}
                 title="Example Module Structure"
                 showLineNumbers={true}
               />
            </div>
         </div>
      </section>

      {/* Index Pattern */}
      <section className="py-16">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
               <CodeBlock
                 code={indexPatternExample}
                 title="Example: src/modules/auth/index.ts"
                 showLineNumbers={true}
               />
               <div>
                  <h2 className="text-2xl font-bold mb-4">Best Practices for index.ts</h2>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                     The <code className="text-primary">index.ts</code> file is the public contract of your module.
                     Export only what external consumers need.
                  </p>
                  <div className="space-y-4">
                     <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-start gap-3">
                        <EyeOff className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                           <h4 className="text-sm font-bold text-white">Don't Export Internals</h4>
                           <p className="text-xs text-red-200/70">Private helper functions should stay private</p>
                        </div>
                     </div>
                     <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                           <h4 className="text-sm font-bold text-white">Export Named</h4>
                           <p className="text-xs text-blue-200/70">Use named exports for tree-shaking benefits</p>
                        </div>
                     </div>
                     <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                           <h4 className="text-sm font-bold text-white">Re-Export Types</h4>
                           <p className="text-xs text-green-200/70">Share types across modules efficiently</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Shared Utilities */}
      <section className="py-16 bg-secondary/5">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
               <div>
                  <h2 className="text-2xl font-bold mb-4">Shared Utilities</h2>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                     The <code className="text-primary">src/utils</code> directory contains pure functions and helpers
                     that are shared across the application without side effects.
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                     <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                        <Building className="w-6 h-6 text-primary mb-2" />
                        <div className="text-lg font-bold text-primary">10+</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Helpers</div>
                     </div>
                     <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                        <Copy className="w-6 h-6 text-primary mb-2" />
                        <div className="text-lg font-bold text-primary">DRY</div>
                        <div className="text-[10px] text-muted-foreground uppercase">No duplication</div>
                     </div>
                  </div>
               </div>
               <CodeBlock
                 code={utilsStructure}
                 title="Example: src/utils/index.ts"
                 showLineNumbers={true}
               />
            </div>
         </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 text-center">
         <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-4">Structure is Everything</h2>
            <p className="text-muted-foreground mb-8">
               Now that you understand the folder organization, learn how to configure
               your environment.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <Link href="/docs/configuration">
                  <Button size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
                     Explore Configuration
                  </Button>
               </Link>
               <Link href="/docs/architecture">
                  <Button variant="outline" size="lg">View Architecture</Button>
               </Link>
            </div>
         </div>
      </section>
    </div>
  );
}
