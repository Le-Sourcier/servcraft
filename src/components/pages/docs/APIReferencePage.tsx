"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Code2,
  ChevronRight,
  Layers,
  Box,
  Zap,
  Shield,
  Database,
  Terminal,
  Cpu,
  Globe,
  Mail,
  Lock,
  Bell,
  Search,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const apiServices = [
  {
    category: "Core Services",
    icon: Cpu,
    services: [
      {
        name: "AuthService",
        icon: Lock,
        description: "JWT authentication, token management, and secure password sessions.",
        methods: [
          { name: "login", params: "(email, password)", returns: "Promise<AuthTokens>", desc: "Authenticate user and return access/refresh tokens." },
          { name: "register", params: "(userData)", returns: "Promise<User>", desc: "Create a new user with secure password hashing." },
          { name: "refresh", params: "(token)", returns: "Promise<AuthTokens>", desc: "Rotate tokens using a valid refresh token." },
          { name: "logout", params: "(userId)", returns: "Promise<void>", desc: "Invalidate user sessions." },
        ],
      },
      {
        name: "UserService",
        icon: Shield,
        description: "User CRUD operations and profile management with built-in RBAC.",
        methods: [
          { name: "findById", params: "(id)", returns: "Promise<User>", desc: "Fetch user by unique ID." },
          { name: "findByEmail", params: "(email)", returns: "Promise<User>", desc: "Fetch user by email address." },
          { name: "update", params: "(id, data)", returns: "Promise<User>", desc: "Safely update user properties." },
          { name: "delete", params: "(id)", returns: "Promise<void>", desc: "Soft delete or remove user." },
        ],
      },
    ],
  },
  {
    category: "Data & Performance",
    icon: Database,
    services: [
      {
        name: "CacheService",
        icon: Zap,
        description: "High-performance Redis caching layer with intelligent TTL.",
        methods: [
          { name: "get", params: "<T>(key)", returns: "Promise<T | null>", desc: "Retrieve typed data from cache." },
          { name: "set", params: "(key, val, ttl?)", returns: "Promise<void>", desc: "Store data with optional expiration time." },
          { name: "invalidate", params: "(pattern)", returns: "Promise<void>", desc: "Remove keys matching a specific pattern." },
        ],
      },
      {
        name: "DatabaseService",
        icon: Database,
        description: "Direct access to the Prisma-powered data layer.",
        methods: [
          { name: "$transaction", params: "([commands])", returns: "Promise<any>", desc: "Execute atomic database operations." },
          { name: "connect", params: "()", returns: "Promise<void>", desc: "Initialize DB connection pool." },
        ],
      },
    ],
  },
  {
    category: "Communication",
    icon: Mail,
    services: [
      {
        name: "EmailService",
        icon: Mail,
        description: "Transactional email delivery with Handlebars template support.",
        methods: [
          { name: "send", params: "(options)", returns: "Promise<void>", desc: "Send raw HTML or text emails." },
          { name: "sendTemplate", params: "(name, data)", returns: "Promise<void>", desc: "Render and send a pre-defined template." },
        ],
      },
      {
        name: "NotificationService",
        icon: Bell,
        description: "Unified notification system for Push, SMS, and In-app alerts.",
        methods: [
          { name: "notify", params: "(userId, event)", returns: "Promise<void>", desc: "Triggers multi-channel notification flow." },
        ],
      },
    ],
  },
];

const usageExample = `// Example: Using services in a custom controller
import { authService } from '@/modules/auth/service';
import { cacheService } from '@/modules/cache/service';
import { HttpError } from '@/utils/errors';

export class DashboardController {
  async getStats(req, res) {
    const cacheKey = \`stats:\${req.user.id}\`;

    // 1. Try to get from cache
    const cachedStats = await cacheService.get(cacheKey);
    if (cachedStats) return res.send(cachedStats);

    // 2. Fetch from database if mission
    const stats = await db.order.aggregate({
      where: { userId: req.user.id },
      _sum: { amount: true }
    });

    // 3. Store in cache for 5 minutes (300s)
    await cacheService.set(cacheKey, stats, 300);

    return res.send(stats);
  }
}`;

export function APIReferencePage() {
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
                <Code2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  API <span className="gradient-text">Reference</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Detailed technical documentation for ServCraft internal services
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="py-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold mb-4">Architecture of Services</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                All services in ServCraft are designed as singletons, making them easy to inject and use across your application.
                They are fully typed with TypeScript and use predictable error handling patterns.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
                  <CheckCircle2 className="w-4 h-4" /> Fully Type-Safe
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-full border border-blue-400/20">
                  <Zap className="w-4 h-4" /> Singleton Pattern
                </div>
                <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20">
                  <AlertCircle className="w-4 h-4" /> Auto-Error Handling
                </div>
              </div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Quick Links</h3>
              <ul className="space-y-3">
                {apiServices.map(cat => (
                  <li key={cat.category}>
                    <a href={`#${cat.category.toLowerCase().replace(/\s+/g, '-')}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors text-muted-foreground">
                      <cat.icon className="w-4 h-4" /> {cat.category}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Usage Example */}
      <section className="py-16 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Service Implementation</h2>
            <p className="text-muted-foreground">How to import and use internal services within your business logic.</p>
          </div>
          <CodeBlock
            code={usageExample}
            title="src/controllers/dashboard.controller.ts"
            showLineNumbers={true}
          />
        </div>
      </section>

      {/* Detailed Services */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {apiServices.map((category) => (
              <div key={category.category} id={category.category.toLowerCase().replace(/\s+/g, '-')} className="scroll-mt-32">
                <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                  <category.icon className="w-6 h-6 text-primary" />
                  <h3 className="text-2xl font-bold">{category.category}</h3>
                </div>

                <div className="grid gap-12">
                  {category.services.map((service) => (
                    <div key={service.name} className="relative">
                      <div className="flex flex-col lg:flex-row gap-8">
                        <div className="lg:w-1/3">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <service.icon className="w-5 h-5 text-primary" />
                            </div>
                            <h4 className="text-xl font-bold font-mono">{service.name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                            {service.description}
                          </p>
                        </div>

                        <div className="flex-1">
                          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm">
                                <thead>
                                  <tr className="bg-white/5 border-b border-border">
                                    <th className="px-4 py-3 font-semibold">Method</th>
                                    <th className="px-4 py-3 font-semibold">Parameters</th>
                                    <th className="px-4 py-3 font-semibold">Returns</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {service.methods.map((method) => (
                                    <tr key={method.name} className="hover:bg-white/[0.02] transition-colors group">
                                      <td className="px-4 py-4">
                                        <div className="font-mono font-bold text-primary">{method.name}<span className="text-muted-foreground">()</span></div>
                                        <div className="text-[11px] text-muted-foreground mt-1">{method.desc}</div>
                                      </td>
                                      <td className="px-4 py-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                        {method.params}
                                      </td>
                                      <td className="px-4 py-4 font-mono text-xs text-secondary-foreground">
                                        {method.returns}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 bg-secondary/10 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold mb-4">Need More Info?</h2>
            <p className="text-muted-foreground mb-8">
              Check out our modules documentation to see how these services are integrated into larger features.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/modules">
                <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Browse Modules
                </Button>
              </Link>
              <Link href="/docs/getting-started">
                <Button variant="outline" size="lg">
                  Back to Hub
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
