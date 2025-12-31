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
  Shield,
  Code2,
  Rocket,
  Layers,
  Lock,
  Terminal as TerminalIcon,
  Search,
  Laptop
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const requirements = [
  { icon: CheckCircle2, text: "Node.js 18+ installed" },
  { icon: CheckCircle2, text: "npm, yarn, or pnpm" },
  { icon: CheckCircle2, text: "Docker (optional but recommended)" },
];

const installSteps = [
  {
    step: "01",
    title: "Global Installation",
    desc: "First, install the ServCraft CLI globally on your machine.",
    code: "npm install -g servcraft"
  },
  {
    step: "02",
    title: "Initialize Project",
    desc: "Run the init command to start the interactive setup wizard.",
    code: "servcraft init my-new-api"
  },
  {
    step: "03",
    title: "Launch Dev Server",
    desc: "Jump into the folder and start building with hot-reload.",
    code: "cd my-new-api && npm run dev"
  }
];

export function GettingStartedPage() {
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
                <Rocket className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  Getting <span className="gradient-text">Started</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  From zero to a production-ready API in minutes
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
               <Laptop className="w-32 h-32 text-primary" />
            </div>
            <div className="relative">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Environment Prerequisites
              </h2>
              <div className="flex flex-wrap gap-4">
                {requirements.map(req => (
                  <div key={req.text} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0a0a0f] border border-white/5 text-sm text-muted-foreground">
                    <req.icon className="w-4 h-4 text-green-500" /> {req.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Installation Steps */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-12">
               {installSteps.map((s) => (
                 <div key={s.step} className="flex gap-6 group">
                    <div className="flex flex-col items-center">
                       <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm group-hover:bg-primary group-hover:text-white transition-all">
                          {s.step}
                       </div>
                       <div className="flex-1 w-px bg-white/5 my-2" />
                    </div>
                    <div className="pb-8">
                       <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                       <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{s.desc}</p>
                       <code className="block p-3 rounded-xl bg-[#0a0a0f] border border-white/5 text-xs text-primary font-mono">
                          {s.code}
                       </code>
                    </div>
                 </div>
               ))}
            </div>

            <div className="relative">
               <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full" />
               <div className="relative p-1 rounded-[32px] bg-gradient-to-br from-white/10 to-transparent">
                  <div className="rounded-[31px] bg-[#0d0d12] p-8 overflow-hidden">
                     <div className="flex items-center gap-2 mb-6 opacity-40">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-[10px] font-mono ml-2 uppercase tracking-widest">Installation Preview</span>
                     </div>
                     <div className="font-mono text-sm leading-relaxed text-muted-foreground">
                        <p className="text-green-400">? Project name: <span className="text-white">my-awesome-api</span></p>
                        <p className="mt-1 text-green-400">? Select language: <span className="text-white">TypeScript</span></p>
                        <p className="mt-1 text-green-400">? Select database: <span className="text-white">PostgreSQL</span></p>
                        <p className="mt-1 text-green-400">? Choose validator: <span className="text-white">Zod</span></p>
                        <p className="mt-4 text-blue-400">Creating files...</p>
                        <p className="text-blue-400">Installing dependencies...</p>
                        <p className="mt-4 text-white font-bold animation-pulse">Success! Now run:</p>
                        <p className="text-primary italic">cd my-awesome-api && npm run dev</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Manual Installation */}
      <section className="py-20 bg-secondary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
           <h2 className="text-3xl font-bold mb-6">Need a template?</h2>
           <p className="text-muted-foreground mb-8">
             ServCraft comes with pre-configured templates for common use cases.
           </p>
           <CodeBlock
             title="Template usage"
             code={`# Minimal setup
servcraft init my-api --template minimal

# Full battery-included setup (recommended)
servcraft init my-api --template full`}
           />
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link href="/docs/structure">
            <Button size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
              Architecture Overview
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
