# Servcraft

A modular, production-ready Node.js backend framework built with TypeScript, Fastify, and Prisma.

## Features

- **Core Server**: Fastify with graceful shutdown, health checks
- **Authentication**: JWT access/refresh tokens, RBAC
- **User Management**: Full CRUD with roles & permissions
- **Validation**: Zod/Joi/Yup support
- **Database**: Prisma ORM (PostgreSQL, MySQL, SQLite)
- **Email**: SMTP with Handlebars templates
- **Security**: Helmet, CORS, Advanced rate limiting (fixed/sliding window, token bucket)
- **Logging**: Pino structured logs + Audit trail
- **Docker**: Ready for containerization
- **CLI**: Generate modules, controllers, services

## How to Use the Services

The modules (Rate Limiting, Webhooks, Queue, Websockets, etc.) are **reusable services** that you integrate into your own routes and controllers. They are NOT standalone user-facing endpoints.

### Quick Integration Example

```typescript
// YOUR controller (e.g., src/modules/post/post.controller.ts)
import { webhookService } from '../webhook';
import { queueService, emailWorker } from '../queue';
import { wsService } from '../websocket';
import { strictRateLimit } from '../rate-limit';

class PostController {
  async createPost(req, res) {
    // 1. Create the post
    const post = await db.post.create(req.body);

    // 2. Use webhook service - notify external systems
    await webhookService.publishEvent('post.created', {
      postId: post.id,
      title: post.title,
      author: req.user.id
    });

    // 3. Use queue service - send emails asynchronously
    await queueService.addJob('emails', 'send-email', {
      to: 'admin@example.com',
      subject: 'New Post Created',
      html: `<p>${post.title} was published</p>`
    });

    // 4. Use websocket service - real-time notification
    await wsService.broadcastToAll('post:new', post);

    // 5. Use cache service - invalidate cache
    await cacheService.delete('posts:latest');

    res.json(post);
  }
}

// Apply rate limiting to YOUR routes
app.post('/api/posts', strictRateLimit, postController.createPost);
app.get('/api/posts', standardRateLimit, postController.list);
```

### Available Services

All services are available as importable modules in your code:

| Service | Import | Usage |
|---------|--------|-------|
| **Rate Limiting** | `import { strictRateLimit, createRateLimiter } from './modules/rate-limit'` | Apply as middleware on routes |
| **Webhooks** | `import { WebhookService } from './modules/webhook'` | Publish events to external URLs |
| **Queue/Jobs** | `import { QueueService, emailWorker } from './modules/queue'` | Background tasks & cron jobs |
| **Websockets** | `import { WebSocketService, ChatFeature } from './modules/websocket'` | Real-time communication |
| **Cache** | `import { CacheService } from './modules/cache'` | Redis caching |
| **MFA** | `import { MFAService } from './modules/mfa'` | Two-factor authentication |
| **OAuth** | `import { OAuthService } from './modules/oauth'` | Social login |
| **Payments** | `import { PaymentService } from './modules/payment'` | Process payments |
| **Upload** | `import { UploadService } from './modules/upload'` | File uploads |
| **Notifications** | `import { NotificationService } from './modules/notification'` | Send notifications |
| **Search** | `import { SearchService, ElasticsearchAdapter } from './modules/search'` | Full-text search with Elasticsearch/Meilisearch |

### Common Integration Patterns

**Pattern 1: E-commerce Order Flow**
```typescript
async createOrder(req, res) {
  const order = await db.order.create(req.body);

  // Send webhook to inventory system
  await webhookService.publishEvent('order.created', order);

  // Queue payment processing
  await queueService.addJob('payments', 'process-payment', {
    orderId: order.id,
    amount: order.total
  });

  // Real-time update to user
  await wsService.broadcastToUsers([order.userId], 'order:created', order);

  // Queue confirmation email (delayed 5 minutes)
  await queueService.addJob('emails', 'send-email', {
    to: order.email,
    template: 'order-confirmation',
    data: order
  }, { delay: 5 * 60 * 1000 });

  res.json(order);
}
```

**Pattern 2: User Registration**
```typescript
async register(req, res) {
  const user = await db.user.create(req.body);

  // Generate MFA secret
  const mfaSetup = await mfaService.setupTOTP(user.id, 'MyApp');

  // Queue welcome email
  await queueService.addJob('emails', 'send-email', {
    to: user.email,
    subject: 'Welcome!',
    template: 'welcome',
    data: { user, mfaQR: mfaSetup.qrCode }
  });

  // Webhook to CRM
  await webhookService.publishEvent('user.registered', user);

  res.json({ user, mfaSetup });
}
```

**Pattern 3: Content Moderation**
```typescript
async uploadImage(req, res) {
  // Upload file
  const file = await uploadService.upload(req.file, {
    allowedTypes: ['image/jpeg', 'image/png'],
    maxSize: 5 * 1024 * 1024
  });

  // Queue image processing
  await queueService.addJob('images', 'process-image', {
    source: file.path,
    operations: [
      { type: 'resize', options: { width: 800 } },
      { type: 'watermark', options: { text: '© MyApp' } },
      { type: 'compress', options: { quality: 80 } }
    ],
    output: `/processed/${file.id}.jpg`
  });

  res.json(file);
}
```

### Auto-Generated Documentation

Yes! Use the built-in docs generator:

```bash
# Generate API documentation automatically
servcraft docs generate

# This will scan all your routes and generate:
# - OpenAPI/Swagger spec
# - Endpoint list
# - Request/response examples
```

The `src/cli/commands/docs.ts` file I created does this automatically!

## Quick Start

### Create a new project

```bash
npx servcraft init my-app
cd my-app
npm run dev
```

### Interactive setup

```bash
npx servcraft init
```

You'll be prompted to choose:
- Project name
- Language (TypeScript/JavaScript)
- Database (PostgreSQL, MySQL, SQLite, MongoDB)
- Validation library (Zod, Joi, Yup)
- Features (Auth, Users, Email, etc.)

## CLI Commands

### Initialize project

```bash
servcraft init [name]           # Create new project
servcraft init --yes            # Use defaults
servcraft init --js             # Use JavaScript
servcraft init --db postgresql  # Specify database
```

### Generate resources

```bash
# Generate complete module
servcraft generate module product
servcraft g m product --prisma   # Include Prisma model

# Generate individual files
servcraft generate controller user
servcraft generate service order
servcraft generate repository item
servcraft generate schema post
servcraft generate routes comment

# Aliases
servcraft g c user              # controller
servcraft g s order             # service
servcraft g r item              # repository
servcraft g v post              # schema/validator
```

### Add pre-built modules

```bash
servcraft add auth              # Authentication module
servcraft add users             # User management
servcraft add email             # Email service
servcraft add audit             # Audit logging
servcraft add cache             # Redis cache
servcraft add upload            # File uploads
servcraft add rate-limit        # Advanced rate limiting
servcraft add webhook           # Outgoing webhooks
servcraft add queue             # Background jobs & queues
servcraft add websocket         # Real-time with Socket.io
servcraft add search            # Elasticsearch/Meilisearch search
servcraft add --list            # Show all modules
```

### Database commands

```bash
servcraft db migrate            # Run migrations
servcraft db push               # Push schema
servcraft db generate           # Generate client
servcraft db studio             # Open Prisma Studio
servcraft db seed               # Seed database
servcraft db reset              # Reset database
```

## Project Structure

```
my-app/
├── src/
│   ├── core/                   # Server, logger
│   ├── config/                 # Environment config
│   ├── modules/
│   │   ├── auth/               # Authentication
│   │   ├── user/               # User management
│   │   ├── email/              # Email service
│   │   └── [your-modules]/
│   ├── middleware/             # Security, error handling
│   ├── utils/                  # Helpers, errors
│   ├── types/                  # Type definitions
│   └── index.ts                # Entry point
├── prisma/
│   └── schema.prisma           # Database schema
├── tests/
│   ├── unit/
│   └── integration/
├── docker-compose.yml
└── package.json
```

## Module Architecture

Each module follows the Controller/Service/Repository pattern:

```
modules/product/
├── product.types.ts            # Interfaces & types
├── product.schemas.ts          # Validation schemas
├── product.repository.ts       # Data access layer
├── product.service.ts          # Business logic
├── product.controller.ts       # HTTP handlers
├── product.routes.ts           # Route definitions
└── index.ts                    # Module exports
```

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
DATABASE_PROVIDER=postgresql

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_MAX=100

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=pass

# Logging
LOG_LEVEL=info
```

## Modules

### Rate Limiting

Advanced rate limiting with multiple algorithms and strategies:

**Features:**
- Multiple algorithms: Fixed Window, Sliding Window, Token Bucket
- Storage options: In-memory or Redis (for distributed systems)
- Flexible key generation: IP, User ID, API Key, or custom
- Whitelist/Blacklist support
- Custom limits per endpoint or user role
- Standard rate limit headers (X-RateLimit-*)
- Admin API for management

**Usage:**

```typescript
import {
  createRateLimiter,
  strictRateLimit,
  authRateLimit,
  userRateLimit
} from './modules/rate-limit';

// Global rate limiter
app.use(createRateLimiter({
  max: 100,                    // 100 requests
  windowMs: 60 * 1000,         // per minute
  algorithm: 'sliding-window'  // or 'fixed-window', 'token-bucket'
}));

// Pre-configured limiters
app.post('/login', authRateLimit, loginHandler);        // 5 req/15min
app.post('/sensitive', strictRateLimit, sensitiveHandler); // 5 req/min

// Custom limiters
app.get('/api/data',
  userRateLimit(1000, 60 * 60 * 1000),  // 1000 req/hour per user
  dataHandler
);

// Per-endpoint limits
app.use(createRateLimiter({
  max: 100,
  windowMs: 60 * 1000,
  customLimits: {
    'POST:/api/expensive': { max: 10, windowMs: 60 * 1000 },
    'role:admin': { max: 10000, windowMs: 60 * 1000 }
  }
}));
```

**Admin Routes:**

```
GET    /rate-limit/info/:key      Get rate limit info
POST   /rate-limit/reset/:key     Reset rate limit
GET    /rate-limit/config         Get configuration
POST   /rate-limit/whitelist      Add IP to whitelist
DELETE /rate-limit/whitelist/:ip  Remove from whitelist
POST   /rate-limit/blacklist      Add IP to blacklist
DELETE /rate-limit/blacklist/:ip  Remove from blacklist
POST   /rate-limit/clear          Clear all data
POST   /rate-limit/cleanup        Cleanup expired entries
```

**Redis Storage (for multi-instance):**

```typescript
import { RateLimitService, RedisStore } from './modules/rate-limit';
import Redis from 'ioredis';

const redis = new Redis();
const store = new RedisStore(redis);
const service = new RateLimitService({ max: 100, windowMs: 60000 }, store);
```

### Webhooks Sortants

Send events to external URLs with automatic retry, HMAC signatures, and monitoring:

**Features:**
- Automatic retry with exponential backoff
- HMAC-SHA256 signature verification
- Delivery tracking and monitoring
- Multiple retry strategies
- Event filtering by type
- Webhook endpoint management

**Usage:**

```typescript
import { WebhookService, createWebhookRoutes } from './modules/webhook';

// Create service
const webhookService = new WebhookService({
  maxRetries: 5,
  timeout: 10000,
  enableSignature: true
});

// Create endpoint
const endpoint = await webhookService.createEndpoint({
  url: 'https://example.com/webhook',
  events: ['user.created', 'order.completed'],
  description: 'Production webhook'
});

// Publish event
await webhookService.publishEvent('user.created', {
  userId: '123',
  email: 'user@example.com',
  name: 'John Doe'
});

// Add routes
app.use('/api/webhooks', authMiddleware, createWebhookRoutes(webhookService));
```

**Signature Verification (Recipient Side):**

```typescript
import { verifyWebhookSignature } from './modules/webhook';

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = 'your-webhook-secret';

  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  res.json({ received: true });
});
```

**Admin Routes:**

```
POST   /webhooks/endpoints              Create endpoint
GET    /webhooks/endpoints              List endpoints
GET    /webhooks/endpoints/:id          Get endpoint
PATCH  /webhooks/endpoints/:id          Update endpoint
DELETE /webhooks/endpoints/:id          Delete endpoint
POST   /webhooks/endpoints/:id/rotate-secret  Rotate secret
POST   /webhooks/events                 Publish event
GET    /webhooks/deliveries             List deliveries
GET    /webhooks/deliveries/:id         Get delivery
GET    /webhooks/deliveries/:id/attempts  Get attempts
POST   /webhooks/deliveries/:id/retry   Retry delivery
GET    /webhooks/stats                  Get statistics
POST   /webhooks/cleanup                Cleanup old data
```

**Retry Strategies:**

```typescript
import {
  ExponentialBackoffStrategy,
  LinearBackoffStrategy,
  FixedDelayStrategy
} from './modules/webhook';

// Exponential: 1s, 2s, 4s, 8s, 16s
const exponential = new ExponentialBackoffStrategy(1000, 60000, 2, 5);

// Linear: 5s, 10s, 15s
const linear = new LinearBackoffStrategy(5000, 3);

// Fixed: 10s, 10s, 10s
const fixed = new FixedDelayStrategy(10000, 3);
```

### Queue/Jobs (Background Tasks)

Background job processing with Bull/BullMQ, cron scheduling, and pre-built workers:

**Features:**
- Background job processing
- Priority queues
- Automatic retry with backoff
- Cron-based scheduling
- Job progress tracking
- Real-time monitoring & metrics
- 10+ pre-built workers

**Usage:**

```typescript
import {
  QueueService,
  CronJobManager,
  emailWorker,
  imageProcessingWorker,
  CronSchedules
} from './modules/queue';

// Create queue service
const queueService = new QueueService({
  redis: { host: 'localhost', port: 6379 },
  metrics: true
});

// Register workers
queueService.registerWorker('emails', emailWorker);
queueService.registerWorker('images', imageProcessingWorker);

// Add job
await queueService.addJob('emails', 'send-email', {
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to our service</h1>'
}, {
  priority: 'high',
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 }
});

// Bulk jobs
await queueService.addBulkJobs('notifications', {
  jobs: [
    { name: 'send-notification', data: { userId: '1', message: 'Hello' } },
    { name: 'send-notification', data: { userId: '2', message: 'Hi' } }
  ]
});
```

**Cron Jobs:**

```typescript
const cronManager = new CronJobManager(queueService);

// Daily backup at midnight
await cronManager.createCronJob(
  'Daily Backup',
  CronSchedules.DAILY,
  'maintenance',
  'database-backup',
  { databases: ['main', 'analytics'] }
);

// Custom cron expression: Every 15 minutes
await cronManager.createCronJob(
  'Cache Warming',
  '*/15 * * * *',
  'cache',
  'warm-cache',
  { keys: ['popular-posts', 'trending-users'] }
);
```

**Pre-built Workers:**

- `emailWorker` - Send emails (nodemailer, SendGrid, etc.)
- `imageProcessingWorker` - Resize, crop, watermark images
- `notificationWorker` - Push/SMS/email notifications
- `webhookWorker` - HTTP webhooks
- `dataExportWorker` - Export to CSV/Excel/PDF
- `reportGenerationWorker` - Generate reports
- `databaseBackupWorker` - Database backups
- `cacheWarmingWorker` - Cache warming
- `dataCleanupWorker` - Clean old data
- `batchProcessingWorker` - Batch processing

**Admin Routes:**

```
GET    /queue/queues                    List all queues
GET    /queue/queues/:name/stats        Get queue stats
GET    /queue/queues/:name/metrics      Get queue metrics
POST   /queue/queues/:name/pause        Pause queue
POST   /queue/queues/:name/resume       Resume queue
POST   /queue/queues/:name/jobs         Add job
POST   /queue/queues/:name/jobs/bulk    Add bulk jobs
GET    /queue/queues/:name/jobs         List jobs
GET    /queue/queues/:name/jobs/:id     Get job
DELETE /queue/queues/:name/jobs/:id     Remove job
POST   /queue/queues/:name/jobs/:id/retry  Retry job
POST   /queue/queues/:name/clean        Clean old jobs
POST   /queue/cron                      Create cron job
GET    /queue/cron                      List cron jobs
GET    /queue/cron/:id                  Get cron job
PATCH  /queue/cron/:id                  Update cron job
DELETE /queue/cron/:id                  Delete cron job
POST   /queue/cron/:id/trigger          Trigger cron job
```

**Cron Schedules:**

```typescript
CronSchedules.EVERY_MINUTE       // * * * * *
CronSchedules.EVERY_15_MINUTES   // */15 * * * *
CronSchedules.EVERY_HOUR         // 0 * * * *
CronSchedules.DAILY              // 0 0 * * *
CronSchedules.WEEKLY             // 0 0 * * 0
CronSchedules.MONTHLY            // 0 0 1 * *
CronSchedules.WEEKDAYS_9AM       // 0 9 * * 1-5
```

### Websockets/Real-time

Real-time communication with Socket.io for chat, presence, notifications, and live events:

**Features:**
- Real-time chat with typing indicators
- User presence tracking (online/offline/away)
- Live notifications
- Room/namespace management
- Event broadcasting
- Authentication & role-based access
- Rate limiting & throttling

**Usage:**

```typescript
import {
  WebSocketService,
  ChatFeature,
  PresenceFeature,
  NotificationFeature,
  authMiddleware
} from './modules/websocket';

// Create service
const wsService = new WebSocketService({
  cors: { origin: 'http://localhost:3000' },
  redis: { host: 'localhost', port: 6379 }
});

// Initialize with HTTP server
wsService.initialize(httpServer);

// Create features
const chat = new ChatFeature(wsService);
const presence = new PresenceFeature(wsService);
const notifications = new NotificationFeature(wsService);

// Send chat message
await chat.sendMessage('room-123', 'user-456', 'Hello everyone!', {
  mentions: ['user-789']
});

// Typing indicator
await chat.startTyping('room-123', 'user-456', 'John');

// Send notification
await notifications.send(
  'user-123',
  'message',
  'New Message',
  'You have a new message from John'
);

// Broadcast live event
await wsService.broadcastToAll('analytics:update', {
  metric: 'active_users',
  value: 1250
});
```

**Client-side:**

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' },
  query: { username: 'john' }
});

// Listen for events
socket.on('chat:message', (msg) => console.log('New message:', msg));
socket.on('presence:status', (status) => console.log('Status:', status));
socket.on('notification:new', (notif) => console.log('Notification:', notif));
socket.on('live:event', (event) => console.log('Live event:', event));

// Send message
socket.emit('chat:send', { roomId: 'room-123', content: 'Hello!' });

// Start typing
socket.emit('chat:typing', { roomId: 'room-123' });
```

**Middlewares:**

```typescript
import {
  authMiddleware,
  rateLimitMiddleware,
  roleMiddleware,
  throttleMiddleware
} from './modules/websocket';

// Apply middlewares
io.use(authMiddleware());
io.use(rateLimitMiddleware(5, 60000)); // 5 connections per minute
io.use(roleMiddleware(['user', 'admin']));
io.use(throttleMiddleware(100, 1000)); // 100 events per second
```

**Features:**

- **Chat**: Messages, typing indicators, mentions, edit/delete
- **Presence**: Online/away/busy status, last seen
- **Notifications**: Real-time push, read/unread tracking
- **Live Events**: Analytics, system updates, custom events
- **Rooms**: Create, join, leave, member management
- **Broadcasting**: To all, to room, to specific users

### Search (Elasticsearch/Meilisearch)

Full-text search with support for Elasticsearch, Meilisearch, or in-memory adapter for development:

**Features:**
- Multiple search engines: Elasticsearch, Meilisearch, In-memory
- Unified interface for all engines
- Full-text search with fuzzy matching
- Filtering, sorting, pagination
- Faceted search
- Autocomplete suggestions
- Similar document search
- Bulk indexing
- Index management & statistics

**Usage:**

```typescript
import {
  SearchService,
  ElasticsearchAdapter,
  MeilisearchAdapter,
  MemorySearchAdapter
} from './modules/search';

// Using Elasticsearch
import { Client } from '@elastic/elasticsearch';
const esClient = new Client({ node: 'http://localhost:9200' });
const searchService = new SearchService(
  { engine: 'elasticsearch' },
  new ElasticsearchAdapter(esClient)
);

// Or Meilisearch
import { MeiliSearch } from 'meilisearch';
const meiliClient = new MeiliSearch({ host: 'http://localhost:7700' });
const searchService = new SearchService(
  { engine: 'meilisearch' },
  new MeilisearchAdapter(meiliClient)
);

// Or in-memory (for development)
const searchService = new SearchService(); // Uses MemorySearchAdapter by default

// Create an index
await searchService.createIndex('products', {
  searchableAttributes: ['title', 'description', 'tags'],
  filterableAttributes: ['category', 'price', 'inStock'],
  sortableAttributes: ['price', 'createdAt']
});

// Index documents
await searchService.indexDocuments('products', [
  {
    id: '1',
    title: 'Laptop',
    description: 'High-performance laptop',
    category: 'electronics',
    price: 999,
    inStock: true
  },
  {
    id: '2',
    title: 'Headphones',
    description: 'Noise-canceling headphones',
    category: 'electronics',
    price: 299,
    inStock: true
  }
]);

// Search
const results = await searchService.search('products', {
  query: 'laptop',
  filters: [
    { field: 'category', operator: 'eq', value: 'electronics' },
    { field: 'price', operator: 'lte', value: 1000 }
  ],
  sort: [{ field: 'price', direction: 'asc' }],
  limit: 10
});

// Autocomplete
const suggestions = await searchService.autocomplete('products', 'lap', 5);

// Search with facets
const facetResults = await searchService.searchWithFacets('products', 'laptop', {
  facets: ['category', 'inStock'],
  filters: [{ field: 'price', operator: 'gte', value: 100 }]
});

// Similar documents
const similar = await searchService.searchSimilar('products', '1', 5);

// Reindex (with transformation)
await searchService.reindex('products', 'products_v2', (doc) => ({
  ...doc,
  slug: doc.title.toLowerCase().replace(/\s+/g, '-')
}));
```

**Integration Example:**

```typescript
// Product search endpoint
app.get('/api/products/search', async (req, res) => {
  const { q, category, minPrice, maxPrice, sort } = req.query;

  const filters = [];
  if (category) {
    filters.push({ field: 'category', operator: 'eq', value: category });
  }
  if (minPrice) {
    filters.push({ field: 'price', operator: 'gte', value: Number(minPrice) });
  }
  if (maxPrice) {
    filters.push({ field: 'price', operator: 'lte', value: Number(maxPrice) });
  }

  const results = await searchService.search('products', {
    query: q || '*',
    filters,
    sort: sort ? [{ field: sort, direction: 'asc' }] : undefined,
    limit: 20
  });

  res.json(results);
});

// Autocomplete endpoint
app.get('/api/products/autocomplete', async (req, res) => {
  const { q } = req.query;
  const suggestions = await searchService.autocomplete('products', q, 10);
  res.json(suggestions);
});

// Index product when created
app.post('/api/products', async (req, res) => {
  const product = await db.product.create(req.body);

  // Index in search engine
  await searchService.indexDocument('products', product.id, product);

  res.json(product);
});
```

**Filter Operators:**

- `eq` - Equal to
- `ne` - Not equal to
- `gt` - Greater than
- `gte` - Greater than or equal to
- `lt` - Less than
- `lte` - Less than or equal to
- `in` - In array
- `nin` - Not in array
- `contains` - Contains text
- `exists` - Field exists

**Index Statistics:**

```typescript
const stats = await searchService.getStats('products');
console.log({
  documentCount: stats.documentCount,
  size: stats.size,
  isIndexing: stats.isIndexing,
  health: stats.health
});
```

## Modules & Resources

ServCraft includes these pre-built modules:

### Core Modules
- ✅ **Authentication** - JWT access/refresh tokens, RBAC
- ✅ **User Management** - Full CRUD with roles & permissions
- ✅ **Email Service** - SMTP with Handlebars templates
- ✅ **Audit Logging** - Activity tracking & audit trail

### Advanced Features
- ✅ **Cache Module** - Redis caching with TTL & invalidation
- ✅ **Rate Limiting** - Fixed/sliding window, token bucket algorithms
- ✅ **Webhooks (Outgoing)** - HMAC signatures, auto-retry, delivery tracking
- ✅ **Queue/Jobs** - Background tasks, cron scheduling, 10+ workers
- ✅ **Websockets/Real-time** - Chat, presence, notifications, live events
- ✅ **Search** - Elasticsearch/Meilisearch full-text search
- ✅ **File Upload** - Multi-provider support (local, S3, etc.)
- ✅ **MFA/TOTP** - Two-factor authentication with QR codes
- ✅ **OAuth** - Google, GitHub, Facebook, Twitter, Apple
- ✅ **Payments** - Stripe, PayPal, Mobile Money integration
- ✅ **Notifications** - Email, SMS, Push notifications

### Coming Soon
- ⏳ **i18n/Localization** - Multi-language support
- ⏳ **Feature Flags** - A/B testing, progressive rollout
- ⏳ **Analytics/Metrics** - Prometheus, custom metrics
- ⏳ **Media Processing** - Image/video processing with FFmpeg
- ⏳ **API Versioning** - Multiple API versions support

## API Endpoints

### Authentication

```
POST /auth/register     Register new user
POST /auth/login        Login
POST /auth/refresh      Refresh tokens
POST /auth/logout       Logout
GET  /auth/me           Get current user
POST /auth/change-password
```

### Users (Admin)

```
GET    /users           List users
GET    /users/:id       Get user
PATCH  /users/:id       Update user
DELETE /users/:id       Delete user
POST   /users/:id/suspend
POST   /users/:id/ban
POST   /users/:id/activate
```

### Health

```
GET /health             Health check
GET /ready              Readiness check
```

## Docker

### Development

```bash
docker-compose up -d
```

### Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Scripts

```bash
npm run dev             # Development with hot reload
npm run build           # Build for production
npm run start           # Start production server
npm run test            # Run tests
npm run test:coverage   # Test with coverage
npm run lint            # Lint code
npm run format          # Format code
npm run typecheck       # Type check
npm run db:migrate      # Run migrations
npm run db:push         # Push schema
npm run db:studio       # Open Prisma Studio
npm run db:seed         # Seed database
```

## License

MIT
