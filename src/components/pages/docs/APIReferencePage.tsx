"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Code2,
  ChevronRight,
  Layers,
  Box,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";

const apiServices = [
  {
    category: "Core Services",
    services: [
      {
        name: "AuthService",
        description: "JWT authentication, token management, password hashing",
        methods: ["login", "register", "logout", "refresh"],
      },
      {
        name: "UserService",
        description: "User CRUD operations, profile management",
        methods: ["create", "findById", "findByEmail", "update"],
      },
    ],
  },
  {
    category: "Data Services",
    services: [
      {
        name: "CacheService",
        description: "Redis caching with TTL support",
        methods: ["get", "set", "delete", "invalidate"],
      },
    ],
  },
];

const usageExample = `import { authService } from '../modules/auth/service';
import { cacheService } from '../modules/cache/service';

// Using services in your controller
async getPosts(req, res) {
  const cached = await cacheService.get('posts:latest');
  if (cached) return res.json(cached);

  const posts = await prisma.post.findMany();
  await cacheService.set('posts:latest', posts, 300);
  res.json(posts);
}`;

export function APIReferencePage() {
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
                <Code2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  API <span className="gradient-text">Reference</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Detailed API documentation for all services
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Usage Example */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Using Services</h2>
          <div className="p-6 rounded-xl bg-[#0d0d14] border border-border">
            <pre className="text-foreground overflow-x-auto text-sm font-mono">
              <code>{usageExample}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Services by Category */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {apiServices.map((category) => (
              <div key={category.category}>
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  {category.category}
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {category.services.map((service) => (
                    <div key={service.name} className="p-5 rounded-xl bg-card border border-border">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Box className="w-4 h-4 text-primary" />
                        {service.name}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {service.methods.map((method) => (
                          <span key={method} className="px-2 py-0.5 rounded text-xs font-mono bg-secondary text-secondary-foreground">
                            {method}()
                          </span>
                        ))}
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
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-center">
          <Link href="/quickstart">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
