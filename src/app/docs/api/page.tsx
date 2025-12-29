"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Code2,
  ChevronRight,
  Zap,
  Database,
  Shield,
  Globe,
  Mail,
  Bell,
  Wifi,
  Search,
  CreditCard,
  Layers,
  Settings,
  Cpu,
  FileCode,
  Box,
  ArrowRight,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

const apiServices = [
  {
    category: "Core Services",
    services: [
      {
        name: "AuthService",
        description: "JWT authentication, token management, password hashing",
        methods: ["login", "register", "logout", "refresh", "validate"],
      },
      {
        name: "UserService",
        description: "User CRUD operations, profile management",
        methods: ["create", "findById", "findByEmail", "update", "delete"],
      },
      {
        name: "ConfigService",
        description: "Application configuration management",
        methods: ["get", "set", "validate", "reload"],
      },
      {
        name: "LoggerService",
        description: "Structured logging with Pino",
        methods: ["info", "warn", "error", "debug", "child"],
      },
    ],
  },
  {
    category: "Security Services",
    services: [
      {
        name: "RateLimitService",
        description: "Rate limiting with multiple algorithms",
        methods: ["check", "consume", "reset", "getRemaining"],
      },
      {
        name: "WebhookService",
        description: "Outgoing webhooks with HMAC signatures",
        methods: ["publish", "retry", "cancel", "status"],
      },
      {
        name: "MFAService",
        description: "Two-factor authentication with TOTP",
        methods: ["setup", "verify", "disable", "backupCodes"],
      },
      {
        name: "OAuthService",
        description: "Social login providers",
        methods: ["getAuthUrl", "handleCallback", "refreshToken"],
      },
    ],
  },
  {
    category: "Data Services",
    services: [
      {
        name: "CacheService",
        description: "Redis caching with TTL support",
        methods: ["get", "set", "delete", "invalidate", "flush"],
      },
      {
        name: "QueueService",
        description: "Background job processing with BullMQ",
        methods: ["addJob", "process", "schedule", "cancel", "status"],
      },
      {
        name: "SearchService",
        description: "Full-text search with Elasticsearch/Meilisearch",
        methods: ["index", "search", "delete", "update"],
      },
      {
        name: "AnalyticsService",
        description: "Prometheus metrics and event tracking",
        methods: ["track", "metric", "gauge", "histogram"],
      },
    ],
  },
  {
    category: "Communication Services",
    services: [
      {
        name: "EmailService",
        description: "SMTP email sending with templates",
        methods: ["send", "sendTemplate", "verifyConnection"],
      },
      {
        name: "NotificationService",
        description: "Multi-channel notifications",
        methods: ["send", "sendBulk", "sendPush", "sendSMS"],
      },
      {
        name: "WebSocketService",
        description: "Real-time communication with Socket.io",
        methods: ["broadcast", "emitToUser", "joinRoom", "leaveRoom"],
      },
    ],
  },
  {
    category: "Integration Services",
    services: [
      {
        name: "PaymentService",
        description: "Stripe, PayPal, and mobile money",
        methods: ["createPayment", "confirmPayment", "refund", "webhook"],
      },
      {
        name: "UploadService",
        description: "File uploads to S3, Cloudinary, local",
        methods: ["upload", "delete", "getUrl", "getSignedUrl"],
      },
      {
        name: "MediaService",
        description: "Image and video processing",
        methods: ["resize", "compress", "transcode", "thumbnail"],
      },
      {
        name: "FeatureFlagService",
        description: "A/B testing and feature flags",
        methods: ["isEnabled", "getValue", "toggle", "trackVariant"],
      },
    ],
  },
  {
    category: "Utility Services",
    services: [
      {
        name: "I18nService",
        description: "Internationalization and localization",
        methods: ["t", "setLocale", "getLocale", "addTranslations"],
      },
      {
        name: "VersioningService",
        description: "API versioning support",
        methods: ["getVersion", "setVersion", "getCompatible"],
      },
    ],
  },
];

const usageExample = `import { authService } from '../modules/auth/service';
import { userService } from '../modules/users/service';
import { cacheService } from '../modules/cache/service';

// Using services in your controller
class PostController {
  async getPosts(req, res) {
    // Check cache first
    const cached = await cacheService.get('posts:latest');
    if (cached) {
      return res.json(cached);
    }

    // Fetch from database
    const posts = await prisma.post.findMany({
      where: { published: true },
      include: { author: true }
    });

    // Cache the result for 5 minutes
    await cacheService.set('posts:latest', posts, 5 * 60);

    res.json(posts);
  }

  async createPost(req, res) {
    const { title, content } = req.body;
    const userId = req.user.id;

    // Create the post
    const post = await prisma.post.create({
      data: {
        title,
        content,
        authorId: userId
      }
    });

    // Invalidate cache
    await cacheService.invalidate('posts:latest');

    // Emit real-time update
    await wsService.broadcastToAll('post:new', post);

    res.status(201).json(post);
  }
}`;

const middlewareList = [
  { name: "authMiddleware", desc: "Verify JWT tokens and attach user" },
  { name: "rateLimitMiddleware", desc: "Apply rate limiting to routes" },
  { name: "validationMiddleware", desc: "Validate request body/params/query" },
  { name: "i18nMiddleware", desc: "Set locale from request headers" },
  { name: "corsMiddleware", desc: "Handle Cross-Origin Resource Sharing" },
  { name: "helmetMiddleware", desc: "Add security headers" },
  { name: "compressionMiddleware", desc: "Compress responses" },
  { name: "loggerMiddleware", desc: "Log all requests" },
];

export default function APIReferencePage() {
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Using <span className="gradient-text">Services</span>
            </h2>
            <p className="text-muted-foreground">
              All services are available as importable modules
            </p>
          </motion.div>

          <div className="p-6 rounded-xl bg-[#0d0d14] border border-border">
            <div className="font-mono text-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileCode className="w-5 h-5 text-primary" />
                <span className="text-primary">src/controllers/post.controller.ts</span>
              </div>
              <pre className="text-foreground overflow-x-auto">
                <code>{usageExample}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Services by Category */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Available <span className="gradient-text">Services</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              All services follow consistent patterns with TypeScript types
            </p>
          </motion.div>

          <div className="space-y-16">
            {apiServices.map((category, catIndex) => (
              <motion.div
                key={category.category}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: catIndex * 0.1 }}
              >
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  {category.category}
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {category.services.map((service, svcIndex) => (
                    <motion.div
                      key={service.name}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: (catIndex * 0.1) + (svcIndex * 0.05) }}
                      className="p-5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <Box className="w-4 h-4 text-primary" />
                            {service.name}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {service.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {service.methods.map((method) => (
                          <span
                            key={method}
                            className="px-2 py-0.5 rounded text-xs font-mono bg-secondary text-secondary-foreground"
                          >
                            {method}()
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Middleware Reference */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Middleware <span className="gradient-text">Reference</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {middlewareList.map((mw, index) => (
              <motion.div
                key={mw.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border"
              >
                <Layers className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <code className="font-mono text-sm text-primary">{mw.name}</code>
                  <p className="text-xs text-muted-foreground">{mw.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Error Handling */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Error <span className="gradient-text">Handling</span>
            </h2>
          </motion.div>

          <div className="p-6 rounded-xl bg-[#0d0d14] border border-border">
            <div className="font-mono text-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="text-yellow-500">HttpError class</span>
              </div>
              <pre className="text-foreground overflow-x-auto">
                <code>{`// Throw HTTP errors
import { HttpError } from '../utils/errors';

class UserController {
  async getUser(req, res) {
    const { id } = req.params;

    const user = await userService.findById(id);
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    if (user.id !== req.user.id && req.user.role !== 'ADMIN') {
      throw new HttpError(403, 'Forbidden');
    }

    res.json(user);
  }
}

// Error response format
// {
//   "error": {
//     "code": "NOT_FOUND",
//     "message": "User not found",
//     "status": 404
//   }
// }`}</code>
              </pre>
            </div>
          </div>
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
              Ready to <span className="gradient-text">Start Building</span>?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/quickstart">
                <Button rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Quick Start
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="outline">Back to Docs</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
