"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Layers,
  Box,
  Plug,
  Settings,
  ChevronRight,
  Zap,
  Shield,
  Code2,
  Workflow,
  Cpu,
  Unplug
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const architectureLayers = [
  {
    layer: "01",
    title: "CLI & Toolbox",
    description: "The entry point for productivity. Handles scaffolding, module management, and environment healthy checks.",
    icon: Terminal,
    items: ["Command Parser", "Blueprint Engine", "Doctor Utility"]
  },
  {
    layer: "02",
    title: "Fastify Core",
    description: "The high-performance engine powering the HTTP layer. Minimal overhead, maximum throughput.",
    icon: Zap,
    items: ["Plugin System", "Encapsulated Context", "Efficient Routing"]
  },
  {
    layer: "03",
    title: "Service Layer",
    description: "The business logic heart. Reusable, singleton services that handle complex data and external integrations.",
    icon: Cpu,
    items: ["Singleton Pattern", "Dependency Injection", "Isolated Logic"]
  },
  {
    layer: "04",
    title: "Data Interface",
    description: "Type-safe database interaction using Prisma. Bridges the gap between models and database engines.",
    icon: Database,
    items: ["Type-Safe Queries", "Migration Engine", "Schema Validation"]
  },
];

const lifecycleExample = `// Internal Lifecycle overview
1. Request -> Fastify Hook (onRequest)
2. Middleware -> Validation (Zod/Joi)
3. Controller -> Service Call
4. Service -> Prisma Client -> DB
5. Service -> Response Format
6. Fastify Hook (onResponse) -> Client`;

export function ArchitecturePage() {
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
                <Layers className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  The <span className="gradient-text">Architecture</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Engineered for scale, modularity, and developer happiness
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-3xl font-bold text-white">Modular by Design</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                ServCraft isn't a monolithic framework. It's a collection of isolated, well-defined layers that communicate through clean interfaces.
                Our philosophy is simple: **Stay out of the developer's way while providing the strongest possible foundations.**
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-primary font-bold text-xl mb-1">0%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Global State</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-primary font-bold text-xl mb-1">100%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Encapsulation</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-primary font-bold text-xl mb-1">&lt;10ms</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Core Overhead</div>
                </div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full group-hover:bg-primary/30 transition-all" />
              <div className="relative p-6 rounded-2xl bg-card border border-border shadow-2xl">
                 <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                   <Workflow className="w-4 h-4 text-primary" /> Request Lifecycle
                 </h3>
                 <pre className="text-[11px] font-mono text-muted-foreground leading-relaxed">
                   {lifecycleExample}
                 </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Layers Grid */}
      <section className="py-20 lg:py-32 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
             <h2 className="text-3xl font-bold mb-4">The Stack Breakdown</h2>
             <p className="text-muted-foreground max-w-2xl mx-auto">Each layer has its own responsibility, making the system easy to test and debug.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {architectureLayers.map((layer, idx) => (
              <div key={layer.title} className="relative group">
                <div className="absolute -top-4 -right-4 text-6xl font-black text-white/5 group-hover:text-primary/10 transition-colors pointer-events-none">{layer.layer}</div>
                <div className="h-full p-8 rounded-3xl bg-card border border-border flex flex-col hover:border-primary/40 transition-all hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <layer.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{layer.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
                    {layer.description}
                  </p>
                  <div className="pt-6 border-t border-white/5 space-y-2">
                     {layer.items.map(item => (
                       <div key={item} className="flex items-center gap-2 text-[10px] text-primary/70 font-semibold tracking-wider uppercase">
                         <ChevronRight className="w-3 h-3" /> {item}
                       </div>
                     ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plug and Play Modules */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="p-8 lg:p-12 rounded-[40px] bg-gradient-to-br from-primary/10 to-accent/10 border border-white/10 relative overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                 <div>
                   <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                     <Unplug className="w-8 h-8 text-white" />
                   </div>
                   <h2 className="text-3xl font-bold text-white mb-4">Plugin Architecture</h2>
                   <p className="text-muted-foreground leading-relaxed">
                     Our module system is built on the official Fastify plugin specification.
                     This means any standard Fastify plugin is 100% compatible with ServCraft,
                     and our own modules can be removed or swapped without breaking core functionality.
                   </p>
                 </div>
                 <div className="bg-[#0b0b10] rounded-2xl p-2 border border-white/5 shadow-2xl">
                   <CodeBlock
                     title="Plugin encapsulation example"
                     code={`// Each module is an isolated Fastify Plugin
export async function fastifyPlugin(app) {
  // Routes and logic inside this block
  // are scoped and isolated.
  app.decorate('myUtility', () => 'Logic');
  app.get('/path', controller.handler);
}`}
                   />
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 text-center">
        <Link href="/docs/structure">
          <Button size="lg">Explore Directory Structure</Button>
        </Link>
      </section>
    </div>
  );
}
