"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Terminal,
  FileCode,
  Database,
  Shield,
  Layers,
  BookOpen,
  ChevronRight,
  Code2,
  Cpu,
  Globe,
  Zap,
  Sparkles,
  Settings,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const docSections = [
  {
    icon: Sparkles,
    title: "Getting Started",
    description: "Install ServCraft and create your first project in minutes.",
    href: "/docs/getting-started",
    color: "from-blue-500 to-cyan-500",
    items: [
      { label: "Installation", href: "/docs/getting-started" },
      { label: "Quick Start", href: "/docs/quickstart" },
    ],
  },
  {
    icon: Layers,
    title: "Core Concepts",
    description: "Learn the fundamentals of ServCraft architecture.",
    href: "/docs/architecture",
    color: "from-purple-500 to-pink-500",
    items: [
      { label: "Architecture", href: "/docs/architecture" },
      { label: "Project Structure", href: "/docs/structure" },
      { label: "Configuration", href: "/docs/configuration" },
    ],
  },
  {
    icon: Shield,
    title: "Features",
    description: "Deep dive into authentication, database, and more.",
    href: "/docs/auth",
    color: "from-green-500 to-emerald-500",
    items: [
      { label: "Authentication", href: "/docs/auth" },
      { label: "Database", href: "/docs/database" },
    ],
  },
  {
    icon: Terminal,
    title: "References",
    description: "Complete CLI commands and API documentation.",
    href: "/docs/cli",
    color: "from-orange-500 to-amber-500",
    items: [
      { label: "CLI Reference", href: "/docs/cli" },
      { label: "API Reference", href: "/docs/api" },
    ],
  },
  {
    icon: Globe,
    title: "Modules",
    description: "Explore all available modules.",
    href: "/modules",
    color: "from-red-500 to-rose-500",
    items: [
      { label: "Browse Modules", href: "/modules" },
    ],
  },
];

export default function DocsPage() {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 gradient-bg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  <span className="gradient-text">Documentation</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Everything you need to build amazing backends with ServCraft
                </p>
              </div>
            </div>

            <div className="mt-8 max-w-xl">
              <CodeBlock
                code={`# Install ServCraft CLI
npm install -g servcraft

# Create a new project
servcraft init my-api

# Add modules
servcraft add auth users email

# Start development
cd my-api && npm run dev`}
                title="Quick Start"
                showLineNumbers={false}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Documentation Sections */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            {docSections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={section.href}
                  className="group block p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 h-full"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <section.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                        {section.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {section.description}
                      </p>
                      <ul className="space-y-2">
                        {section.items.map((item) => (
                          <li key={item.href}>
                            <span className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                              <ChevronRight className="w-3 h-3 text-primary" />
                              {item.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Need Help Section */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border"
          >
            <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Need Help?</h2>
            <p className="text-muted-foreground mb-6">
              Check out our FAQ or join our community for answers to your questions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/docs/getting-started">
                <Button>Get Started</Button>
              </Link>
              <a
                href="https://github.com/Le-Sourcier/servcraft/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">Open an Issue</Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
