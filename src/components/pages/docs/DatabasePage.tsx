"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Database,
  Server,
  RefreshCw,
  ChevronRight,
  Save,
  CheckCircle2,
  Table,
  Zap,
  Shield,
  Key,
  Code2,
  Terminal,
  Grid,
  AlertTriangle,
  Info,
  Lock,
  Braces,
  FileJson,
  Hash,
  HardDrive,
  Network,
  Activity,
  Layers,
  Cpu,
  FileCode
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CodeBlock } from "@/components/CodeBlock";

const databases = [
  {
    name: "PostgreSQL",
    icon: Database,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    description: "Production-ready, highly reliable relational database. Recommended for most applications.",
    features: ["JSONB Support", "Full-text search", "GIN Indexes", "ACID Compliance", "Window Functions"]
  },
  {
    name: "MySQL",
    icon: Server,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    description: "Battle-tested, reliable and widely used open-source relational database.",
    features: ["Query caching", "High availability", "Large ecosystem", "InnoDB Engine", "Replication"]
  },
  {
    name: "SQLite",
    icon: Save,
    color: "text-gray-400",
    bg: "bg-gray-400/10",
    description: "Zero-config, file-based database. Ideal for development and small projects.",
    features: ["Single file", "In-memory mode", "Perfect for testing", "Zero setup", "Cross-platform"]
  },
  {
    name: "MongoDB",
    icon: Grid,
    color: "text-green-400",
    bg: "bg-green-400/10",
    description: "NoSQL document database for applications requiring flexible schemas.",
    features: ["Flexible schema", "Easy scaling", "JSON documents", "Aggregation pipelines", "Geospatial"]
  },
];

const schemaExample = `// prisma/schema.prisma - Advanced Schema Design
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "fullTextIndex"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Base User model with relations
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  role      Role      @default(USER)
  status    UserStatus @default(ACTIVE)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  // Relations
  posts     Post[]
  profile   Profile?
  sessions  Session[]

  @@index([email])
  @@index([status, createdAt]) // Composite index
  @@map("users")
}

// One-to-Many: Users have many posts
model Post {
  id        String     @id @default(cuid())
  title     String
  content   String?
  published Boolean    @default(false)
  author    User       @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String
  tags      Tag[]      @relation("PostTags")
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@index([authorId, published]) // Compound index
  @@index([published, createdAt]) // For feed queries
  @@fulltext([title, content]) // Full-text search
  @@map("posts")
}

// Many-to-Many: Posts <-> Tags
model Tag {
  id    String @id @default(cuid())
  name  String @unique
  posts Post[] @relation("PostTags")

  @@index([name])
  @@map("tags")
}

// One-to-One: Each user has one profile
model Profile {
  id       String  @id @default(cuid())
  bio      String?
  website  String?
  avatar   String?
  user     User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId   String  @unique
  settings Json?   // Flexible JSONB for custom user settings

  @@unique([userId])
  @@map("profiles")
}

// Session management for auth
model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
  ipAddress String?
  userAgent String?

  @@index([token]) // Fast session lookup
  @@index([userId, expiresAt])
  @@index([expiresAt]) // For cleanup jobs
  @@map("sessions")
}

// Enums for type safety
enum Role {
  USER
  ADMIN
  MODERATOR
  GUEST
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  BANNED
}`;

const transactionExample = `// src/modules/posts/post.service.ts
import { prisma } from '@/lib/prisma';

export class PostService {
  // Transaction: Create post with tags atomically
  async createPostWithTags(data: {
    title: string;
    content: string;
    authorId: string;
    tagNames: string[];
  }) {
    return await prisma.$transaction(async (tx) => {
      // 1. Create the post
      const post = await tx.post.create({
        data: {
          title: data.title,
          content: data.content,
          authorId: data.authorId,
        },
      });

      // 2. Find or create tags (upsert)
      const tags = await Promise.all(
        data.tagNames.map(name =>
          tx.tag.upsert({
            where: { name },
            create: { name },
            update: {},
          })
        )
      );

      // 3. Connect post to tags
      await tx.post.update({
        where: { id: post.id },
        data: { tags: { connect: tags.map(t => ({ id: t.id })) } },
      });

      return { ...post, tags };
    });
  }

  // Interactive transaction for business logic
  async publishPost(postId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      // Verify ownership in transaction
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: { authorId: true, published: true },
      });

      if (!post) throw new Error('Post not found');
      if (post.authorId !== userId) throw new Error('Not authorized');
      if (post.published) throw new Error('Already published');

      // Publish and update user stats atomically
      const [updatedPost, _user] = await Promise.all([
        tx.post.update({
          where: { id: postId },
          data: { published: true, updatedAt: new Date() },
          include: { author: true, tags: true },
        }),
        tx.user.update({
          where: { id: userId },
          data: { updatedAt: new Date() },
        }),
      ]);

      return updatedPost;
    });
  }

  // Batch operations for performance
  async bulkUpdatePostStatus(postIds: string[], published: boolean) {
    return await prisma.post.updateMany({
      where: { id: { in: postIds } },
      data: { published, updatedAt: new Date() },
    });
  }

  // Transaction with timeout
  async transferOwnership(postId: string, newOwnerId: string) {
    return await prisma.$transaction(
      async (tx) => {
        const post = await tx.post.findUnique({
          where: { id: postId },
          select: { authorId: true },
        });

        if (!post) throw new Error('Post not found');

        return tx.post.update({
          where: { id: postId },
          data: { authorId: newOwnerId },
        });
      },
      { timeout: 5000 } // 5 second timeout
    );
  }
}`;

const cachingExample = `// src/lib/cache.ts - Redis caching layer
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

export const cache = {
  // Get with automatic JSON parsing and type safety
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.error('Cache get error:', e);
      return null;
    }
  },

  // Set with expiration (TTL in seconds)
  async set(key: string, value: unknown, ttl?: number) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (e) {
      console.error('Cache set error:', e);
    }
  },

  // Delete single key
  async del(key: string) {
    await redis.del(key);
  },

  // Cache invalidation patterns
  async invalidate(prefix: string) {
    const keys = await redis.keys(\`\${prefix}*\`);
    if (keys.length) {
      await redis.del(...keys);
    }
  },

  // Pattern: Invalidate all user-related caches
  async invalidateUser(userId: string) {
    await Promise.all([
      this.invalidate(\`user:\${userId}\`),
      this.invalidate(\`posts:\${userId}\`),
      this.invalidate(\`profile:\${userId}\`),
    ]);
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key);
    return result === 1;
  },
};

// Usage in service with cache-aside pattern
export class UserService {
  async getUserWithCache(id: string) {
    // 1. Try cache first (Read-Through)
    const cached = await cache.get(\`user:\${id}\`);
    if (cached) return cached;

    // 2. Cache miss: fetch from DB
    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    // 3. Populate cache with TTL
    if (user) {
      await cache.set(\`user:\${id}\`, user, 300); // 5 min TTL
    }

    return user;
  }

  async updateUser(id: string, data: any) {
    const updated = await prisma.user.update({
      where: { id },
      data,
      include: { profile: true },
    });

    // Write-Through: Invalidate all related caches
    await cache.invalidateUser(id);

    return updated;
  }

  // Get with cache invalidation strategy
  async getPostsByUser(userId: string) {
    const cacheKey = \`posts:\${userId}\`;

    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const posts = await prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      include: { tags: true },
    });

    await cache.set(cacheKey, posts, 60); // 1 min TTL for lists

    return posts;
  }
}`;

const relationExamples = `// Advanced query patterns with Prisma

// 1. Many-to-Many filtering (posts with specific tags)
const postsWithTags = await prisma.post.findMany({
  where: {
    tags: {
      some: { name: 'javascript' },
    },
    author: {
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  },
  include: {
    tags: {
      orderBy: { name: 'asc' },
    },
    author: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  },
  orderBy: { createdAt: 'desc' },
});

// 2. Nested relations with selective fields
const detailedPost = await prisma.post.findUnique({
  where: { id: postId },
  include: {
    author: {
      include: {
        profile: true,
      },
    },
    tags: true,
    _count: {
      select: { tags: true },
    },
  },
});

// 3. Relation counts without fetching data (efficient)
const postList = await prisma.post.findMany({
  select: {
    id: true,
    title: true,
    createdAt: true,
    _count: {
      select: { tags: true },
    },
  },
});

// 4. Full-text search with Prisma
const searchResults = await prisma.post.findMany({
  where: {
    OR: [
      { title: { search: query } },
      { content: { search: query } },
    ],
    published: true,
  },
  take: 20,
});

// 5. Aggregation and grouping
const tagStats = await prisma.tag.findMany({
  include: {
    _count: {
      select: { posts: true },
    },
  },
  orderBy: {
    posts: {
      _count: 'desc',
    },
  },
});

// 6. Complex where conditions with AND/OR
const complexQuery = await prisma.post.findMany({
  where: {
    AND: [
      { published: true },
      {
        OR: [
          { author: { role: 'ADMIN' } },
          { author: { status: 'ACTIVE' } },
        ],
      },
      {
        createdAt: { gte: new Date('2024-01-01') },
      },
    ],
  },
});

// 7. Pagination with cursor
const paginatedPosts = await prisma.post.findMany({
  take: 10,
  skip: 1, // Skip first result (used with cursor)
  cursor: { id: lastPostId },
  orderBy: { createdAt: 'desc' },
});

// 8. Batch transaction updates
const updateResult = await prisma.post.updateMany({
  where: {
    published: false,
    createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days old
  },
  data: { status: 'ARCHIVED' },
});`;

const dbCommands = [
  {
    command: "servcraft db push",
    desc: "Sync your schema with the database without migrations (perfect for prototyping).",
    icon: Zap,
    flags: ["--accept-data-loss", "--skip-generate"]
  },
  {
    command: "servcraft db migrate dev",
    desc: "Generate and run industrial-strength SQL migrations for development.",
    icon: Shield,
    flags: ["--name", "--create-only", "--skip-seed"]
  },
  {
    command: "servcraft db migrate deploy",
    desc: "Deploy migrations to production without generating new ones.",
    icon: Layers,
    flags: []
  },
  {
    command: "servcraft db generate",
    desc: "Regenerate the Prisma client after schema changes.",
    icon: RefreshCw,
    flags: ["--schema"]
  },
  {
    command: "servcraft db seed",
    desc: "Populate your database with initial data from prisma/seed.ts.",
    icon: Terminal,
    flags: []
  },
  {
    command: "servcraft db studio",
    desc: "Launch Prisma Studio for visual database browsing and editing.",
    icon: Table,
    flags: ["--port", "--browser"]
  },
  {
    command: "servcraft db pull",
    desc: "Pull the existing database schema and introspect it into Prisma schema.",
    icon: Network,
    flags: ["--print"]
  },
  {
    command: "servcraft db reset",
    desc: "Reset database and re-run all migrations (destructive!).",
    icon: AlertTriangle,
    flags: ["--force", "--skip-seed"]
  },
  {
    command: "servcraft db status",
    desc: "Check if your database is in sync with your local schema.",
    icon: Info,
    flags: []
  },
  {
    command: "servcraft db migrate resolve",
    desc: "Mark migration as resolved after manual intervention.",
    icon: CheckCircle2,
    flags: ["--applied", "--rolled-back"]
  },
];

const performanceTips = [
  {
    title: "Use Indexes Wisely",
    desc: "Add @@index directives to fields you frequently query or join. Monitor slow queries with EXPLAIN ANALYZE.",
    icon: Zap
  },
  {
    title: "Select Only Needed Fields",
    desc: "Use select: {} to limit returned data. This reduces payload size and query time significantly.",
    icon: Code2
  },
  {
    title: "Batch Operations",
    desc: "Use createMany, updateMany, and deleteMany instead of loops for bulk operations. Much faster.",
    icon: Layers
  },
  {
    title: "Connection Pooling",
    desc: "Configure DATABASE_URL with a proper pool size: postgresql://user:pass@host:5432/db?connection_limit=10",
    icon: Server
  },
  {
    title: "Lazy Loading",
    desc: "Use include only when needed. Prisma queries are lazy - you don't need to always fetch relations.",
    icon: HardDrive
  },
  {
    title: "Transaction Scope",
    desc: "Keep transactions as short as possible. Long transactions lock rows and hurt performance.",
    icon: Activity
  },
];

export function DatabasePage() {
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
                <Database className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  <span className="gradient-text">Database</span> Layer
                </h1>
                <p className="text-muted-foreground mt-1">
                  Type-safe data management with Prisma ORM, caching, and advanced transactions
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Overview */}
      <section className="py-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-white">The Power of Prisma</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                ServCraft leverages **Prisma**, the next-generation Node.js and TypeScript ORM.
                It turns your database schema into a fully type-safe API, preventing runtime errors and providing
                an unmatched developer experience with auto-completion and IntelliSense.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Type-Safe Queries</h4>
                    <p className="text-xs text-muted-foreground">Full TypeScript support with auto-completion</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Migration Management</h4>
                    <p className="text-xs text-muted-foreground">Version-controlled schema changes</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Visual Studio</h4>
                    <p className="text-xs text-muted-foreground">Prisma Studio for data browsing</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Multi-Database</h4>
                    <p className="text-xs text-muted-foreground">PostgreSQL, MySQL, SQLite, MongoDB</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
              <CodeBlock
                code={schemaExample}
                title="prisma/schema.prisma"
                showLineNumbers={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Supported Engines */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Supported Database Engines</h2>
            <p className="text-muted-foreground">Select your engine during initialization with <code className="text-primary">servcraft init --db &lt;engine&gt;</code></p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {databases.map((db) => (
              <div key={db.name} className="p-6 rounded-2xl bg-card border border-border flex flex-col h-full hover:border-primary/50 transition-all">
                <div className={`w-12 h-12 rounded-xl ${db.bg} flex items-center justify-center mb-4`}>
                  <db.icon className={`w-6 h-6 ${db.color}`} />
                </div>
                <h3 className="text-lg font-bold mb-2">{db.name}</h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed flex-1">{db.description}</p>
                <div className="space-y-2">
                  {db.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-[10px] text-foreground/70">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Relations */}
      <section className="py-16 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Network className="w-6 h-6 text-primary" />
                Advanced Relations
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                ServCraft's schema supports all Prisma relation types for modeling complex data structures.
                From simple one-to-many to recursive trees, we've got you covered.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">One-to-Many</h4>
                  <p className="text-xs text-muted-foreground">User has many Posts, Post belongs to User</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Many-to-Many</h4>
                  <p className="text-xs text-muted-foreground">Posts have many Tags, Tags belong to Posts</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">One-to-One</h4>
                  <p className="text-xs text-muted-foreground">User has one Profile, enforced by @@unique</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-bold text-primary mb-1">Recursive/Self-Referential</h4>
                  <p className="text-xs text-muted-foreground">Comments with replies (tree structures)</p>
                </div>
              </div>
            </div>
            <div>
              <CodeBlock
                code={relationExamples}
                title="Advanced query patterns"
                showLineNumbers={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Transactions */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <CodeBlock
                code={transactionExample}
                title="post.service.ts"
                showLineNumbers={true}
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Lock className="w-6 h-6 text-primary" />
                Transactions & Atomicity
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                ACID-compliant transactions ensure data consistency across multiple operations. Use them for
                operations that must succeed or fail together.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">Atomic Operations</h4>
                  <p className="text-xs text-muted-foreground">All operations succeed or rollback together</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">Interactive Transactions</h4>
                  <p className="text-xs text-muted-foreground">Run business logic inside transaction scope</p>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">Batch Operations</h4>
                  <p className="text-xs text-muted-foreground">Update multiple records in a single query</p>
                </div>
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">Transaction Timeouts</h4>
                  <p className="text-xs text-muted-foreground">Prevent long-running transactions with explicit timeouts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Caching */}
      <section className="py-16 bg-secondary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <HardDrive className="w-6 h-6 text-primary" />
                Caching Layer
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Redis integration provides a high-performance caching layer to reduce database load and improve response times.
                ServCraft includes utilities for cache-aside and write-through patterns.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">Cache-Aside Pattern</h4>
                  <p className="text-xs text-muted-foreground">Application checks cache first, then DB on miss</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">Automatic Invalidation</h4>
                  <p className="text-xs text-muted-foreground">Clear related caches on data updates</p>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">TTL Management</h4>
                  <p className="text-xs text-muted-foreground">Set expiration times to prevent stale data</p>
                </div>
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <h4 className="text-sm font-bold text-white mb-1">Pattern-Based Cleanup</h4>
                  <p className="text-xs text-muted-foreground">Invalidate all keys matching a pattern</p>
                </div>
              </div>
            </div>
            <div>
              <CodeBlock
                code={cachingExample}
                title="lib/cache.ts + usage"
                showLineNumbers={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Performance Tips */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Performance Best Practices</h2>
            <p className="text-muted-foreground">Optimize your database queries for production workloads</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {performanceTips.map((tip) => (
              <div key={tip.title} className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all">
                <tip.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="text-sm font-bold text-white mb-2">{tip.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commands Reference */}
      <section className="py-16 bg-secondary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Database Management CLI</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {dbCommands.map((cmd) => (
              <div key={cmd.command} className="p-5 rounded-2xl bg-card border border-border group hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <cmd.icon className="w-5 h-5 text-primary" />
                    </div>
                    <code className="text-sm font-mono text-white">{cmd.command}</code>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">{cmd.desc}</p>
                {cmd.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {cmd.flags.map(f => (
                      <span key={f} className="text-[9px] font-mono text-primary/60 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4 text-white font-bold">Secure your data layer</h2>
          <p className="text-muted-foreground mb-8">Learn how to implement user-level security and authentication.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/docs/auth">
              <Button size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
                Authentication Guide
              </Button>
            </Link>
            <Link href="/docs/api">
              <Button variant="outline" size="lg">
                API Reference
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
