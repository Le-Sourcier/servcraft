"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Layers,
  Box,
  Plug,
  Settings,
  ChevronRight,
  Zap
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const architectureLayers = [
  {
    layer: "1",
    title: "CLI Layer",
    description: "ServCraft CLI for project generation and management",
    icon: Settings,
    components: ["init", "add", "generate", "scaffold"],
  },
  {
    layer: "2",
    title: "Template Layer",
    description: "Code templates that generate your project structure",
    icon: Box,
    components: ["controllers", "services", "schemas", "tests"],
  },
  {
    layer: "3",
    title: "Core Layer",
    description: "Fastify server, middleware, and configuration",
    icon: Layers,
    components: ["server", "app", "middleware", "plugins"],
  },
  {
    layer: "4",
    title: "Module Layer",
    description: "Feature modules for specific functionality",
    icon: Plug,
    components: ["auth", "users", "email", "cache", "queue"],
  },
  {
    layer: "5",
    title: "Service Layer",
    description: "Reusable services used across modules",
    icon: Zap,
    components: ["webhook", "websocket", "search", "analytics"],
  },
];

const designPatterns = [
  {
    title: "Repository Pattern",
    description: "Data access abstraction through Prisma client",
    code: "src/modules/users/user.repository.ts",
  },
  {
    title: "Service Pattern",
    description: "Business logic encapsulation in services",
    code: "src/services/user.service.ts",
  },
  {
    title: "Controller Pattern",
    description: "Request handling and response formatting",
    code: "src/controllers/user.controller.ts",
  },
  {
    title: "Middleware Pattern",
    description: "Request/response preprocessing",
    code: "src/middleware/auth.ts",
  },
];

const moduleStructureArray = [
  { part: "module.ts", desc: "Module configuration and registration" },
  { part: "controller.ts", desc: "HTTP request handlers" },
  { part: "service.ts", desc: "Business logic" },
  { part: "schema.ts", desc: "Validation schemas (Zod/Joi/Yup)" },
  { part: "routes.ts", desc: "Route definitions" },
  { part: "index.ts", desc: "Public exports" },
];

export function ArchitecturePage() {
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
                <Layers className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  <span className="gradient-text">Architecture</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Learn about the modular architecture and design patterns
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Architecture Layers */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Architecture <span className="gradient-text">Layers</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              ServCraft follows a layered architecture for separation of concerns
            </p>
          </motion.div>

          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-accent/50 to-primary/50 hidden md:block" />

            {architectureLayers.map((layer, index) => (
              <motion.div
                key={layer.layer}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className={`flex items-center gap-8 mb-8 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Content */}
                <div className={`flex-1 ${index % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                  <div className="p-6 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`${index % 2 === 0 ? "md:hidden" : ""}`}>
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <layer.icon className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-primary font-mono">Layer {layer.layer}</span>
                        <h3 className="font-semibold text-lg">{layer.title}</h3>
                      </div>
                      <div className={`hidden ${index % 2 === 0 ? "md:block" : ""}`}>
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <layer.icon className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {layer.description}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-start">
                      {layer.components.map((comp) => (
                        <span
                          key={comp}
                          className="px-2 py-0.5 rounded text-xs font-mono bg-secondary text-secondary-foreground"
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Center Dot */}
                <div className="hidden md:flex w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent items-center justify-center z-10 flex-shrink-0 shadow-lg shadow-primary/30">
                  <span className="text-xs font-bold text-white">{layer.layer}</span>
                </div>

                {/* Empty Space */}
                <div className="flex-1 hidden md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Design Patterns */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Design <span className="gradient-text">Patterns</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {designPatterns.map((pattern, index) => (
              <motion.div
                key={pattern.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-xl bg-card border border-border"
              >
                <h3 className="font-semibold mb-2">{pattern.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {pattern.description}
                </p>
                <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                  {pattern.code}
                </code>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Module Structure */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Module <span className="gradient-text">Structure</span>
            </h2>
            <p className="text-muted-foreground">
              Standard structure for all feature modules
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-[#0d0d14] border border-border">
              <div className="font-mono text-sm space-y-2">
                {moduleStructureArray.map((part, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    <span className="text-yellow-400">{part.part}</span>
                    <span className="text-muted-foreground">- {part.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border">
              <CodeBlock
                code={`// Example: src/modules/auth/index.ts
import { AuthController } from './controller';
import { AuthService } from './service';
import { authSchema } from './schema';

export const authModule = {
  controller: AuthController,
  service: AuthService,
  schema: authSchema,
};

export { AuthController } from './controller';
export { AuthService } from './service';
export { default as authMiddleware } from './middleware';`}
                title="Module Index Export"
                showLineNumbers={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Data Flow */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Request <span className="gradient-text">Flow</span>
            </h2>
          </motion.div>

          <CodeBlock
            code={`// 1. Request comes in
app.post('/api/users', userController.create);

// 2. Middleware chain executes (auth, validation, etc.)
// - Rate limiting
// - Authentication
// - Validation (Zod schema)

// 3. Controller receives validated request
class UserController {
  async create(req, res) {
    const data = req.body; // Already validated
    const user = await userService.create(data);
    res.json(user);
  }
}

// 4. Service handles business logic
class UserService {
  async create(data) {
    const hashedPassword = await hash(data.password);
    const user = await prisma.user.create({
      data: { ...data, password: hashedPassword }
    });
    return user;
  }
}

// 5. Response sent back
res.json({ user, message: 'Created successfully' });`}
            title="Request Processing Flow"
          />
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Ready to <span className="gradient-text">Learn More</span>?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/docs/database">
                <Button rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Database Configuration
                </Button>
              </Link>
              <Link href="/docs/auth">
                <Button variant="outline">Authentication</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
