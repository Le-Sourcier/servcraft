"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Lock,
  Users,
  Mail,
  Zap,
  Shield,
  GitBranch,
  RefreshCw,
  Wifi,
  Search,
  Upload,
  CreditCard,
  Bell,
  Globe,
  BarChart,
  Film,
  Flag,
  CheckCircle2,
  Terminal,
  Code2,
  Database,
  Key,
  Layers
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

const categories = [
  {
    id: "auth",
    name: "Authentication & Security",
    icon: Lock,
    color: "from-blue-500 to-cyan-500",
    modules: ["Authentication", "OAuth", "MFA/TOTP"],
  },
  {
    id: "users",
    name: "User Management",
    icon: Users,
    color: "from-purple-500 to-pink-500",
    modules: ["User Management"],
  },
  {
    id: "data",
    name: "Data & Storage",
    icon: Database,
    color: "from-green-500 to-emerald-500",
    modules: ["Redis Cache"],
  },
  {
    id: "communication",
    name: "Communication",
    icon: Mail,
    color: "from-amber-500 to-orange-500",
    modules: ["Email Service", "Notifications", "WebSockets"],
  },
  {
    id: "infrastructure",
    name: "Infrastructure",
    icon: Layers,
    color: "from-red-500 to-rose-500",
    modules: ["Rate Limiting", "Job Queue", "API Versioning"],
  },
  {
    id: "integration",
    name: "Integration",
    icon: GitBranch,
    color: "from-violet-500 to-purple-500",
    modules: ["Webhooks", "File Upload", "Payments"],
  },
  {
    id: "features",
    name: "Advanced Features",
    icon: Zap,
    color: "from-cyan-500 to-teal-500",
    modules: ["Search", "i18n", "Feature Flags", "Analytics", "Media Processing"],
  },
];

const moduleData: Record<string, {
  description: string;
  icon: any;
  gradient: string;
  features: string[];
}> = {
  Authentication: {
    description: "JWT-based authentication with access/refresh tokens",
    icon: Key,
    gradient: "from-blue-500 to-cyan-500",
    features: ["JWT tokens", "Password hashing", "Session management"],
  },
  "User Management": {
    description: "Full CRUD operations with roles and permissions",
    icon: Users,
    gradient: "from-purple-500 to-pink-500",
    features: ["User CRUD", "Roles & permissions", "Profile management"],
  },
  "Email Service": {
    description: "SMTP email sending with Handlebars templates",
    icon: Mail,
    gradient: "from-green-500 to-emerald-500",
    features: ["SMTP support", "HTML emails", "Templates"],
  },
  "Redis Cache": {
    description: "High-performance caching with TTL support",
    icon: Zap,
    gradient: "from-orange-500 to-amber-500",
    features: ["TTL support", "Cache invalidation", "Key management"],
  },
  "Rate Limiting": {
    description: "Advanced rate limiting with multiple algorithms",
    icon: Shield,
    gradient: "from-red-500 to-rose-500",
    features: ["Fixed window", "Token bucket", "IP-based"],
  },
  Webhooks: {
    description: "Outgoing webhooks with HMAC signatures",
    icon: GitBranch,
    gradient: "from-violet-500 to-purple-500",
    features: ["HMAC signatures", "Auto-retry", "Delivery logs"],
  },
  "Job Queue": {
    description: "Background job processing with BullMQ",
    icon: RefreshCw,
    gradient: "from-indigo-500 to-blue-500",
    features: ["BullMQ", "Cron jobs", "Priority queues"],
  },
  WebSockets: {
    description: "Real-time communication with Socket.io",
    icon: Wifi,
    gradient: "from-pink-500 to-rose-500",
    features: ["Socket.io", "Real-time events", "Rooms"],
  },
  Search: {
    description: "Full-text search with Elasticsearch",
    icon: Search,
    gradient: "from-cyan-500 to-teal-500",
    features: ["Elasticsearch", "Full-text search", "Autocomplete"],
  },
  "File Upload": {
    description: "Multi-provider file upload support",
    icon: Upload,
    gradient: "from-lime-500 to-green-500",
    features: ["S3 support", "Image processing", "Signed URLs"],
  },
  "MFA/TOTP": {
    description: "Two-factor authentication with TOTP apps",
    icon: Lock,
    gradient: "from-amber-500 to-orange-500",
    features: ["QR codes", "TOTP apps", "Backup codes"],
  },
  OAuth: {
    description: "Social login with major providers",
    icon: Users,
    gradient: "from-sky-500 to-blue-500",
    features: ["Google", "GitHub", "Facebook"],
  },
  Payments: {
    description: "Payment processing with Stripe and PayPal",
    icon: CreditCard,
    gradient: "from-fuchsia-500 to-pink-500",
    features: ["Stripe", "PayPal", "Webhooks"],
  },
  Notifications: {
    description: "Multi-channel notifications system",
    icon: Bell,
    gradient: "from-rose-500 to-red-500",
    features: ["Email", "SMS", "Push", "Templates"],
  },
  i18n: {
    description: "Internationalization with 7+ locales",
    icon: Globe,
    gradient: "from-emerald-500 to-teal-500",
    features: ["7+ locales", "RTL support", "Plurals"],
  },
  "Feature Flags": {
    description: "A/B testing and progressive rollout",
    icon: Flag,
    gradient: "from-yellow-500 to-amber-500",
    features: ["A/B testing", "Boolean flags", "Analytics"],
  },
  Analytics: {
    description: "Prometheus metrics and event tracking",
    icon: BarChart,
    gradient: "from-teal-500 to-cyan-500",
    features: ["Prometheus", "Custom metrics", "Dashboards"],
  },
  "Media Processing": {
    description: "Image and video processing",
    icon: Film,
    gradient: "from-purple-500 to-violet-500",
    features: ["Image resize", "Video transcoding", "Thumbnails"],
  },
  "API Versioning": {
    description: "Multiple API versions with compatibility",
    icon: Code2,
    gradient: "from-slate-500 to-gray-500",
    features: ["Version prefixes", "Deprecation", "Docs"],
  },
};

function ModuleCard({ module, index, isSelected }: { module: string; index: number; isSelected: boolean }) {
  const data = moduleData[module];
  const command = `servcraft add ${module.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "-")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer",
        "hover:shadow-lg hover:shadow-primary/5",
        isSelected
          ? "bg-card border-primary/50 shadow-lg shadow-primary/10"
          : "bg-card/50 border-border hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0",
          data.gradient
        )}>
          <data.icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {module}
            </h4>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {data.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {data.features.slice(0, 2).map((feature) => (
              <span
                key={feature}
                className="px-1.5 py-0.5 text-[10px] rounded bg-secondary/50 text-secondary-foreground"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border/50">
        <code className="text-[10px] font-mono text-muted-foreground bg-secondary/30 px-2 py-1 rounded flex items-center gap-1.5">
          <Terminal className="w-3 h-3" />
          {command}
        </code>
      </div>
    </motion.div>
  );
}

function CategorySection({ category, modules, searchQuery }: { category: typeof categories[0]; modules: string[]; searchQuery: string }) {
  const filteredModules = modules.filter(m =>
    m.toLowerCase().includes(searchQuery.toLowerCase()) ||
    moduleData[m].description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredModules.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center",
          category.color
        )}>
          <category.icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-lg font-semibold">{category.name}</h3>
        <span className="text-xs text-muted-foreground">({filteredModules.length})</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredModules.map((module, idx) => (
          <ModuleCard
            key={module}
            module={module}
            index={categories.findIndex(c => c.id === category.id) * 4 + idx}
            isSelected={false}
          />
        ))}
      </div>
    </div>
  );
}

export function ModulesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-16 lg:py-24 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              <span className="gradient-text">Modules</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-8">
              19 production-ready modules to add powerful features to your backend
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Modules List */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!searchQuery ? (
            categories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                modules={category.modules}
                searchQuery={searchQuery}
              />
            ))
          ) : (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">
                Search Results ({categories.flatMap(c => c.modules).filter(m =>
                  m.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  moduleData[m].description.toLowerCase().includes(searchQuery.toLowerCase())
                ).length})
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.flatMap(c => c.modules)
                  .filter(m =>
                    m.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    moduleData[m].description.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((module, idx) => (
                    <ModuleCard
                      key={module}
                      module={module}
                      index={idx}
                      isSelected={false}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border"
          >
            <h2 className="text-2xl font-bold mb-4">Ready to Add Modules?</h2>
            <p className="text-muted-foreground mb-6">
              Install ServCraft and start adding modules to your project today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/quickstart">
                <Button size="lg">Quick Start</Button>
              </Link>
              <Link href="/cli">
                <Button variant="outline" size="lg">
                  <Terminal className="w-4 h-4" />
                  CLI Reference
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
