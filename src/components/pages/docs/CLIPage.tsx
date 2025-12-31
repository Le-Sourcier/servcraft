"use client";

import { motion } from "framer-motion";
import {
  Terminal,
  ChevronRight,
  Settings,
  Zap,
  Shield,
  Layers,
  Database,
  Search,
  Code2,
  Cpu,
  FileCode,
  CheckCircle2,
  ArrowRight,
  Activity,
  Package,
  BookOpen
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const cliCards = [
  {
    title: "Project lifecycle",
    commands: [
      { cmd: "servcraft init", desc: "Interactive project setup" },
      { cmd: "servcraft doctor", desc: "Check project health" },
      { cmd: "servcraft update", desc: "Update to latest modules" }
    ]
  },
  {
    title: "Code Generation",
    commands: [
      { cmd: "servcraft add <module>", desc: "Install a feature module" },
      { cmd: "servcraft scaffold <name>", desc: "Generate complete CRUD" },
      { cmd: "servcraft generate", desc: "Create controller/service/schema" }
    ]
  }
];

const categorySections = [
  {
    title: "Initialization",
    icon: SparklesIcon,
    items: [
      { cmd: "servcraft init <name>", desc: "Creates a new project folder and guides you through the setup wizard.", flags: ["--ts", "--prisma", "--validator"] },
    ]
  },
  {
    title: "Development",
    icon: Activity,
    items: [
      { cmd: "servcraft doctor", desc: "Analyzes your environment, dependencies, and Docker settings to ensure everything works.", flags: ["--fix"] },
      { cmd: "servcraft list", desc: "Shows all official modules and their current installation status.", flags: ["--available", "--installed"] },
    ]
  }
];

function SparklesIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
  );
}

export function CLIPage() {
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
                <Terminal className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  CLI <span className="gradient-text">Commands</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Master the command line to build faster than ever
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Speed Dial Section */}
      <section className="py-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
             {cliCards.map(category => (
               <div key={category.title} className="p-8 rounded-[32px] bg-white/5 border border-white/10">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] mb-6">{category.title}</h3>
                  <div className="space-y-4">
                     {category.commands.map(c => (
                       <div key={c.cmd} className="flex items-center gap-4 group">
                          <code className="bg-[#0a0a0f] px-3 py-1.5 rounded-lg text-white font-mono text-xs border border-white/5 group-hover:border-primary/30 transition-colors">
                             {c.cmd}
                          </code>
                          <span className="text-xs text-muted-foreground">{c.desc}</span>
                       </div>
                     ))}
                  </div>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
             {categorySections.map((section) => (
                <div key={section.title}>
                   <div className="flex items-center gap-4 mb-10">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                         <section.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold">{section.title}</h2>
                   </div>

                   <div className="grid gap-6">
                      {section.items.map(item => (
                         <div key={item.cmd} className="p-8 rounded-3xl bg-card border border-border group hover:border-primary/20 transition-all">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between mb-6">
                               <div className="flex items-center gap-3">
                                  <Terminal className="w-6 h-6 text-primary" />
                                  <code className="text-lg font-bold font-mono text-white tracking-tight">{item.cmd}</code>
                               </div>
                               <div className="flex flex-wrap gap-2">
                                  {item.flags.map(f => (
                                    <span key={f} className="text-[10px] font-bold font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded-md border border-white/5">{f}</span>
                                  ))}
                               </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{item.desc}</p>
                         </div>
                      ))}
                   </div>
                </div>
             ))}
          </div>
        </div>
      </section>

      {/* Global Flags */}
      <section className="py-20 bg-secondary/5">
         <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-center">
            <h2 className="text-3xl font-bold mb-4">Global Flags</h2>
            <p className="text-muted-foreground mb-12">Universal options available for every command.</p>

            <div className="inline-flex flex-wrap justify-center gap-4">
               {["--help", "--version", "--dry-run", "--verbose", "--no-color", "--cwd"].map(flag => (
                 <code key={flag} className="px-4 py-2 rounded-xl bg-card border border-border text-sm text-primary font-mono">{flag}</code>
               ))}
            </div>
         </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 text-center">
        <Link href="/docs/api">
          <Button size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
            Explore API Documentation
          </Button>
        </Link>
      </section>
    </div>
  );
}
