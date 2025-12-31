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
  Braces
} from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/Button";

const keyDirectories = [
  {
    name: "src/modules",
    icon: FileBox,
    desc: "The core of your application. Contains feature-based modules (auth, users, etc.) each with its own logic.",
    items: ["Controllers", "Services", "Schemas", "Routes"]
  },
  {
    name: "src/utils",
    icon: Settings,
    desc: "Global helper functions, custom error classes, and shared constants used across the app.",
    items: ["HTTP Errors", "Date Helpers", "Logger Config"]
  },
  {
    name: "prisma/",
    icon: Database,
    desc: "Database schema definitions and migration history managed by Prisma ORM.",
    items: ["schema.prisma", "migrations/"]
  }
];

const fileConventions = [
  { file: "*.controller.ts", desc: "Handles incoming HTTP requests and returns responses.", color: "text-blue-400" },
  { file: "*.service.ts", desc: "Encapsulates business logic and database interactions.", color: "text-purple-400" },
  { file: "*.schema.ts", desc: "Defines Zod/Joi validation for request bodies and params.", color: "text-green-400" },
  { file: "*.routes.ts", desc: "Registers endpoints and attaches specific middleware.", color: "text-orange-400" },
];

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

      {/* Modern Layout */}
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
                  {keyDirectories.map(dir => (
                    <div key={dir.name} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 group hover:border-primary/30 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <dir.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm mb-1">{dir.name}</h4>
                        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{dir.desc}</p>
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

                    <div className="font-mono text-xs space-y-3 leading-relaxed">
                       <div className="flex items-center gap-2 text-yellow-500/80"><FolderTree className="w-3.5 h-3.5" /> my-api/</div>
                       <div className="ml-4 flex items-center gap-2 text-yellow-500/60"><FolderTree className="w-3.5 h-3.5" /> src/</div>
                       <div className="ml-8 flex items-center gap-2 text-yellow-500/60"><FolderTree className="w-3.5 h-3.5" /> modules/</div>
                       <div className="ml-12 flex items-center gap-2 text-yellow-500/40"><FolderTree className="w-3.5 h-3.5" /> auth/</div>
                       <div className="ml-16 flex items-center gap-2 text-blue-400/70"><FileCode className="w-3.5 h-3.5" /> controller.ts</div>
                       <div className="ml-16 flex items-center gap-2 text-purple-400/70"><FileCode className="w-3.5 h-3.5" /> service.ts</div>
                       <div className="ml-16 flex items-center gap-2 text-green-400/70"><FileCode className="w-3.5 h-3.5" /> schema.ts</div>
                       <div className="ml-12 flex items-center gap-2 text-yellow-500/40"><FolderTree className="w-3.5 h-3.5" /> users/</div>
                       <div className="ml-8 flex items-center gap-2 text-blue-400/60"><FileCode className="w-3.5 h-3.5" /> app.ts</div>
                       <div className="ml-8 flex items-center gap-2 text-blue-400/60"><FileCode className="w-3.5 h-3.5" /> server.ts</div>
                       <div className="ml-4 flex items-center gap-2 text-yellow-500/60"><FolderTree className="w-3.5 h-3.5" /> prisma/</div>
                       <div className="ml-4 flex items-center gap-2 text-blue-400/80"><FileCode className="w-3.5 h-3.5" /> servcraft.config.json</div>
                       <div className="ml-4 flex items-center gap-2 text-green-400/80"><FileCode className="w-3.5 h-3.5" /> .env</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Conventions */}
      <section className="py-20 bg-secondary/5">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-8 text-center">File Naming Conventions</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
               {fileConventions.map(conv => (
                 <div key={conv.file} className="p-6 rounded-2xl bg-card border border-border">
                    <code className={cn("text-sm font-bold block mb-2", conv.color)}>{conv.file}</code>
                    <p className="text-xs text-muted-foreground leading-relaxed">{conv.desc}</p>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* Module pattern */}
      <section className="py-20">
         <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
               <h2 className="text-3xl font-bold mb-4">The Module Index Pattern</h2>
               <p className="text-muted-foreground">Every module uses an <code className="text-primary italic">index.ts</code> to control its public interface.</p>
            </div>
            <CodeBlock
              title="Example: src/modules/auth/index.ts"
              code={`// Export only what's necessary
export { authController } from './controller';
export { authSchema } from './schema';
export { authMiddleware } from './middleware';

// Internal services are often kept private within the module
// or exported for other internal services.`}
            />
         </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 text-center">
        <Link href="/docs/configuration">
          <Button size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>Next: Configuration</Button>
        </Link>
      </section>
    </div>
  );
}
