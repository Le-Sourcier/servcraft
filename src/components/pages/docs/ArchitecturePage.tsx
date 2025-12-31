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
  Unplug,
  Terminal,
  Database,
  RefreshCw,
  GitBranch,
  Network,
  Lock,
  Puzzle,
  Server,
  Globe,
  TreeDeciduous,
  FileCode,
  ArrowRight as ArrowRightIcon,
  Zap as ZapIcon,
  Shield as ShieldIcon
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const architectureLayers = [
  {
    layer: "01",
    title: "CLI & Toolbox",
    description: "The entry point for productivity. Handles scaffolding, module management, and environment health checks.",
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

const diExample = `// src/services/container.ts - Manual Dependency Injection
import { authService } from './auth.service';
import { userService } from './user.service';
import { emailService } from './email.service';

// Service container - acts as manual DI container
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  private constructor() {
    // Register core services
    this.services.set('auth', authService);
    this.services.set('user', userService);
    this.services.set('email', emailService);
  }

  // Singleton access pattern
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  // Get service by name
  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(\`Service '\${serviceName}' not found\`);
    }
    return service as T;
  }

  // Register new service dynamically
  register(name: string, service: any): void {
    this.services.set(name, service);
  }
}

// Usage in controller
const container = ServiceContainer.getInstance();
const auth = container.get<typeof authService>('auth');
const user = container.get<typeof userService>('user');

export { ServiceContainer };`;

const contextExtensionExample = `// src/server.ts - Fastify Context Extension
import Fastify from 'fastify';
import { userFromHeader } from './utils/auth';

export async function createServer() {
  const app = Fastify();

  // Add custom decorator to context
  app.decorateRequest('currentUser', async (req) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;

    return await userFromHeader(token);
  });

  // Add database to context (singleton)
  app.decorate('prisma', () => {
    return new PrismaClient();
  });

  // Add logger to context
  app.decorate('logger', () => {
    return pino({
      level: process.env.LOG_LEVEL || 'info',
    });
  });

  // Add configuration to context
  app.decorate('config', () => {
    return {
      jwtSecret: process.env.JWT_ACCESS_SECRET,
      dbUrl: process.env.DATABASE_URL,
    };
  });

  // Now accessible in all route handlers
  app.get('/protected', async (req, reply) => {
    const user = req.currentUser; // Type-safe access
    const db = req.prisma;
    const logger = req.logger;

    logger.info({ userId: user.id }, 'Protected route accessed');

    return { user: user.name };
  });

  await app.listen({ port: 3000 });
}`;

const requestFlowExample = `// Complete Request Flow with DI and Context

// 1. Route Definition with Context Access
app.route({
  method: 'POST',
  url: '/posts',
  preHandler: [authenticate, validate(postSchema)],
  handler: async (req, reply) => {
    // Context provides all needed services
    const user = req.currentUser;
    const db = req.prisma;
    const logger = req.logger;

    // Get post service from DI container
    const postService = ServiceContainer.getInstance().get('post');

    // Business logic
    const post = await postService.createPost({
      ...req.body,
      authorId: user.id,
    });

    logger.info({ postId: post.id }, 'Post created');

    return reply
      .status(201)
      .send(post);
  },
});

// 2. Middleware chain
async function authenticate(req, reply) {
  const token = req.headers.authorization;

  if (!token) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  // Context population
  req.currentUser = await userFromHeader(token);
}

async function validate(schema) {
  return async (req, reply) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: result.error.issues,
      });
    }
  };
}`;

const pluginPatternExample = `// Each module is an isolated Fastify Plugin
export async function authPlugin(app: FastifyInstance, options: any) {
  // Scoped to this plugin only
  const config = options as AuthConfig;

  // Add plugin-specific decorators
  app.decorateRequest('verifyToken', async (req) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    return await verifyToken(token, config.secret);
  });

  // Define plugin routes
  app.register(async function (fastify) {
    fastify.post('/auth/login', async (req, reply) => {
      const { email, password } = req.body;

      const user = await authenticate(email, password);
      const tokens = await generateTokens(user.id);

      return reply.send(tokens);
    });
  });

  // Plugin lifecycle hooks
  app.addHook('onClose', async () => {
    console.log('Auth plugin shutting down');
  });
}

// Plugin registration in main server
import { authPlugin } from './modules/auth/auth.plugin';

app.register(authPlugin, {
  secret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
});

// Modules are completely isolated
// No cross-module pollution
// Can be swapped independently`;

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

      {/* Dependency Injection */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Puzzle className="w-6 h-6 text-primary" />
                Manual Dependency Injection
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                ServCraft uses a manual DI container pattern for service management.
                This provides singleton access to services without the complexity of heavyweight DI frameworks.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Singleton Pattern</h4>
                  <p className="text-xs text-muted-foreground">Services instantiated once and reused</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Type-Safe Access</h4>
                  <p className="text-xs text-muted-foreground">Generic get method with TypeScript</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Dynamic Registration</h4>
                  <p className="text-xs text-muted-foreground">Add services at runtime</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Zero Config</h4>
                  <p className="text-xs text-muted-foreground">No decorator overhead or build tools</p>
                </div>
              </div>
            </div>
            <CodeBlock
              code={diExample}
              title="services/container.ts"
              showLineNumbers={true}
            />
          </div>
        </div>
      </section>

      {/* Context Extension */}
      <section className="py-20 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <CodeBlock
              code={contextExtensionExample}
              title="server.ts - Context Extension"
              showLineNumbers={true}
            />
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Settings2 className="w-6 h-6 text-primary" />
                Fastify Context Extension
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                ServCraft extends the Fastify request context with commonly needed utilities.
                Services, database, logger, and configuration are available on every request.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Type-Safe Decorators</h4>
                  <p className="text-xs text-muted-foreground">req.currentUser is fully typed</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Database Context</h4>
                  <p className="text-xs text-muted-foreground">req.pisma for direct DB access</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Logger Context</h4>
                  <p className="text-xs text-muted-foreground">req.logger for request logging</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Config Context</h4>
                  <p className="text-xs text-muted-foreground">req.config for app settings</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Request Flow */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Network className="w-6 h-6 text-primary" />
                Request Flow Pipeline
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Understanding the complete lifecycle of a request helps with debugging and feature implementation.
                Each stage has a specific responsibility in the pipeline.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">1. Ingress Hook</h4>
                  <p className="text-xs text-muted-foreground">onRequest: Initial request processing</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">2. Middleware Chain</h4>
                  <p className="text-xs text-muted-foreground">Authentication, validation, rate limiting</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">3. Route Handler</h4>
                  <p className="text-xs text-muted-foreground">Business logic and service calls</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">4. Service Layer</h4>
                  <p className="text-xs text-muted-foreground">Data access and external integrations</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">5. Egress Hook</h4>
                  <p className="text-xs text-muted-foreground">onResponse: Final response formatting</p>
                </div>
              </div>
            </div>
            <CodeBlock
              code={requestFlowExample}
              title="Complete Request Flow"
              showLineNumbers={true}
            />
          </div>
        </div>
      </section>

      {/* Plug and Play Modules */}
      <section className="py-20 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="p-8 lg:p-12 rounded-[40px] bg-gradient-to-br from-primary/10 to-accent/10 border border-white/10 relative overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                 <div>
                   <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                     <Unplug className="w-8 h-8 text-white" />
                   </div>
                   <h2 className="text-3xl font-bold text-white mb-4">Plugin Architecture</h2>
                   <p className="text-muted-foreground leading-relaxed mb-6">
                     Our module system is built on the official Fastify plugin specification.
                     This means any standard Fastify plugin is 100% compatible with ServCraft,
                     and our own modules can be removed or swapped without breaking core functionality.
                   </p>
                   <div className="space-y-4">
                     <div className="flex items-start gap-3">
                       <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                       <p className="text-sm text-muted-foreground"><strong>Isolation:</strong> Each module is scoped to its own context</p>
                     </div>
                     <div className="flex items-start gap-3">
                       <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                       <p className="text-sm text-muted-foreground"><strong>Swappable:</strong> Replace any module without affecting others</p>
                     </div>
                     <div className="flex items-start gap-3">
                       <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                       <p className="text-sm text-muted-foreground"><strong>Compatible:</strong> Works with all Fastify plugins</p>
                     </div>
                   </div>
                 </div>
                 <div className="bg-[#0b0b10] rounded-2xl p-2 border border-white/5 shadow-2xl">
                   <CodeBlock
                     title="Plugin encapsulation example"
                     code={pluginPatternExample}
                     showLineNumbers={true}
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

// Settings2 icon component for use in code
function Settings2(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l.22-.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
  );
}

// CheckCircle2 icon
function CheckCircle2(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-10 10 10 0 0 1 1-10h-5" /><path d="m9 11 3 3 7-7" /></svg>
  );
}
