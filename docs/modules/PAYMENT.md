# Payment Module Documentation

## Overview

The Payment module manages payment processing, subscriptions, and billing plans using Prisma ORM with PostgreSQL/MySQL/SQLite support. It provides a complete payment infrastructure with support for multiple payment providers (Stripe, PayPal, Mobile Money).

## Features

- ✅ Prisma ORM integration (PostgreSQL, MySQL, SQLite)
- ✅ Multi-provider support (Stripe, PayPal, Mobile Money, Manual)
- ✅ Payment lifecycle management (pending → completed/failed/refunded)
- ✅ Subscription billing with plans
- ✅ Webhook event handling and storage
- ✅ Pagination and filtering
- ✅ Financial data persistence
- ✅ Enum mapping (Prisma ↔ Application types)

## Architecture

### Components

1. **PaymentRepository** (`payment.repository.ts`)
   - Data access layer using Prisma
   - **Migrated from Map<> to Prisma** ✅ (Completed 2025-12-19)
   - Handles payments, subscriptions, plans, and webhooks

2. **PaymentService** (`payment.service.ts`)
   - Business logic layer
   - Integrates with provider-specific implementations

3. **Provider Implementations**
   - Stripe Provider (`providers/stripe.provider.ts`)
   - PayPal Provider (`providers/paypal.provider.ts`)
   - Mobile Money Provider (`providers/mobile-money.provider.ts`)

## Database Schema

### Payment Model

```prisma
model Payment {
  id                  String          @id @default(uuid())
  userId              String
  user                User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider            PaymentProvider @default(MANUAL)
  method              PaymentMethod   @default(CARD)
  status              PaymentStatus   @default(PENDING)
  amount              Float
  currency            String          @default("USD")
  description         String?
  metadata            Json?
  providerPaymentId   String?         @unique
  providerCustomerId  String?
  refundedAmount      Float?
  failureReason       String?
  paidAt              DateTime?
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  @@index([userId])
  @@index([provider])
  @@index([status])
  @@index([createdAt])
  @@index([providerPaymentId])
  @@map("payments")
}

enum PaymentProvider {
  STRIPE
  PAYPAL
  MOBILE_MONEY
  MANUAL
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
  CANCELLED
}

enum PaymentMethod {
  CARD
  BANK_TRANSFER
  MOBILE_MONEY
  PAYPAL
  CRYPTO
  CASH
}
```

### Subscription Model

```prisma
model Subscription {
  id                    String             @id @default(uuid())
  userId                String
  user                  User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  planId                String
  plan                  Plan               @relation(fields: [planId], references: [id], onDelete: Restrict)
  provider              PaymentProvider    @default(STRIPE)
  providerSubscriptionId String?           @unique
  status                SubscriptionStatus @default(ACTIVE)
  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime
  cancelAtPeriodEnd     Boolean            @default(false)
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  @@index([userId])
  @@index([planId])
  @@index([status])
  @@map("subscriptions")
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  PAST_DUE
  TRIALING
  PAUSED
}
```

### Plan Model

```prisma
model Plan {
  id            String       @id @default(uuid())
  name          String
  description   String?
  amount        Float
  currency      String       @default("USD")
  interval      PlanInterval @default(MONTH)
  intervalCount Int          @default(1)
  trialDays     Int?
  features      Json?
  metadata      Json?
  active        Boolean      @default(true)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  subscriptions Subscription[]

  @@index([active])
  @@map("plans")
}

enum PlanInterval {
  DAY
  WEEK
  MONTH
  YEAR
}
```

### Webhook Model

```prisma
model PaymentWebhook {
  id        String          @id @default(uuid())
  provider  PaymentProvider
  type      String
  data      Json
  processed Boolean         @default(false)
  error     String?
  createdAt DateTime        @default(now())

  @@index([provider])
  @@index([processed])
  @@map("payment_webhooks")
}
```

## Repository API

### Payment Methods

#### `createPayment(data): Promise<Payment>`

Create a new payment.

```typescript
const payment = await paymentRepo.createPayment({
  userId: 'user-id',
  provider: 'stripe',
  method: 'card',
  amount: 99.99,
  currency: 'USD',
  description: 'Premium subscription',
  metadata: { orderId: '12345' },
  providerPaymentId: 'pi_stripe_123',
});
```

#### `findPaymentById(id): Promise<Payment | null>`

Find payment by ID.

```typescript
const payment = await paymentRepo.findPaymentById('payment-id');
```

#### `findPaymentByProviderPaymentId(providerPaymentId): Promise<Payment | null>`

Find payment by provider's payment ID (e.g., Stripe payment intent ID).

```typescript
const payment = await paymentRepo.findPaymentByProviderPaymentId('pi_stripe_123');
```

#### `findUserPayments(userId, params): Promise<PaginatedResult<Payment>>`

Find user's payments with pagination.

```typescript
const result = await paymentRepo.findUserPayments('user-id', {
  page: 1,
  limit: 10,
});

console.log(result.data); // Payment[]
console.log(result.meta); // { page, limit, total, totalPages, hasMore }
```

#### `findPayments(params, filters?): Promise<PaginatedResult<Payment>>`

Find payments with filters and pagination.

```typescript
const result = await paymentRepo.findPayments(
  { page: 1, limit: 20 },
  {
    provider: 'stripe',
    status: 'completed',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
  }
);
```

**Filter options:**
- `userId`: Filter by user
- `provider`: Filter by payment provider
- `status`: Filter by payment status
- `startDate`: Filter payments after date
- `endDate`: Filter payments before date

#### `updatePaymentStatus(id, status, data?): Promise<Payment | null>`

Update payment status.

```typescript
// Mark as completed
await paymentRepo.updatePaymentStatus('payment-id', 'completed', {
  paidAt: new Date(),
});

// Mark as failed
await paymentRepo.updatePaymentStatus('payment-id', 'failed', {
  failureReason: 'Insufficient funds',
});

// Mark as refunded
await paymentRepo.updatePaymentStatus('payment-id', 'refunded', {
  refundedAmount: 99.99,
});
```

#### `deletePayment(id): Promise<boolean>`

Delete payment by ID.

```typescript
const deleted = await paymentRepo.deletePayment('payment-id');
```

#### `countPayments(filters?): Promise<number>`

Count payments with filters.

```typescript
const total = await paymentRepo.countPayments();
const completed = await paymentRepo.countPayments({ status: 'completed' });
```

### Subscription Methods

#### `createSubscription(data): Promise<Subscription>`

Create a new subscription.

```typescript
const subscription = await paymentRepo.createSubscription({
  userId: 'user-id',
  planId: 'plan-id',
  provider: 'stripe',
  currentPeriodStart: new Date(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
  providerSubscriptionId: 'sub_stripe_123',
});
```

#### `findSubscriptionById(id): Promise<Subscription | null>`

Find subscription by ID (includes plan details).

```typescript
const subscription = await paymentRepo.findSubscriptionById('subscription-id');
```

#### `findUserSubscriptions(userId): Promise<Subscription[]>`

Find user's subscriptions.

```typescript
const subscriptions = await paymentRepo.findUserSubscriptions('user-id');
```

#### `updateSubscriptionStatus(id, status): Promise<Subscription | null>`

Update subscription status.

```typescript
await paymentRepo.updateSubscriptionStatus('subscription-id', 'past_due');
```

#### `cancelSubscription(id): Promise<Subscription | null>`

Cancel subscription at period end.

```typescript
await paymentRepo.cancelSubscription('subscription-id');
// Sets cancelAtPeriodEnd = true
```

#### `deleteSubscription(id): Promise<boolean>`

Delete subscription immediately.

```typescript
await paymentRepo.deleteSubscription('subscription-id');
```

### Plan Methods

#### `createPlan(data): Promise<Plan>`

Create a new plan.

```typescript
const plan = await paymentRepo.createPlan({
  name: 'Premium',
  description: 'Premium features',
  amount: 29.99,
  currency: 'USD',
  interval: 'month',
  intervalCount: 1,
  trialDays: 7,
  features: ['Feature 1', 'Feature 2', 'Feature 3'],
  metadata: { priority: 'high' },
  active: true,
});
```

#### `findPlanById(id): Promise<Plan | null>`

Find plan by ID.

```typescript
const plan = await paymentRepo.findPlanById('plan-id');
```

#### `findActivePlans(): Promise<Plan[]>`

Find all active plans (sorted by amount).

```typescript
const plans = await paymentRepo.findActivePlans();
```

#### `updatePlan(id, data): Promise<Plan | null>`

Update plan.

```typescript
await paymentRepo.updatePlan('plan-id', {
  name: 'Premium Plus',
  amount: 39.99,
  active: true,
});
```

#### `deletePlan(id): Promise<boolean>`

Delete plan.

```typescript
await paymentRepo.deletePlan('plan-id');
```

### Webhook Methods

#### `storeWebhookEvent(data): Promise<{ id: string }>`

Store webhook event for processing.

```typescript
const webhook = await paymentRepo.storeWebhookEvent({
  provider: 'stripe',
  type: 'payment_intent.succeeded',
  data: {
    id: 'pi_123',
    amount: 9999,
    currency: 'usd',
  },
});
```

#### `markWebhookProcessed(id, error?): Promise<void>`

Mark webhook as processed.

```typescript
// Success
await paymentRepo.markWebhookProcessed(webhook.id);

// With error
await paymentRepo.markWebhookProcessed(webhook.id, 'Payment not found');
```

## Type Mapping

The repository handles enum conversions between Prisma (UPPERCASE) and application types (lowercase):

### Payment Providers

| Application Type | Prisma Enum |
|------------------|-------------|
| `stripe` | `PaymentProvider.STRIPE` |
| `paypal` | `PaymentProvider.PAYPAL` |
| `mobile_money` | `PaymentProvider.MOBILE_MONEY` |
| `manual` | `PaymentProvider.MANUAL` |

### Payment Status

| Application Type | Prisma Enum |
|------------------|-------------|
| `pending` | `PaymentStatus.PENDING` |
| `processing` | `PaymentStatus.PROCESSING` |
| `completed` | `PaymentStatus.COMPLETED` |
| `failed` | `PaymentStatus.FAILED` |
| `refunded` | `PaymentStatus.REFUNDED` |
| `cancelled` | `PaymentStatus.CANCELLED` |

### Payment Methods

| Application Type | Prisma Enum |
|------------------|-------------|
| `card` | `PaymentMethod.CARD` |
| `bank_transfer` | `PaymentMethod.BANK_TRANSFER` |
| `mobile_money` | `PaymentMethod.MOBILE_MONEY` |
| `paypal` | `PaymentMethod.PAYPAL` |
| `crypto` | `PaymentMethod.CRYPTO` |
| `cash` | `PaymentMethod.CASH` |

### Subscription Status

| Application Type | Prisma Enum |
|------------------|-------------|
| `active` | `SubscriptionStatus.ACTIVE` |
| `cancelled` | `SubscriptionStatus.CANCELLED` |
| `past_due` | `SubscriptionStatus.PAST_DUE` |
| `trialing` | `SubscriptionStatus.TRIALING` |
| `paused` | `SubscriptionStatus.PAUSED` |

### Plan Intervals

| Application Type | Prisma Enum |
|------------------|-------------|
| `day` | `PlanInterval.DAY` |
| `week` | `PlanInterval.WEEK` |
| `month` | `PlanInterval.MONTH` |
| `year` | `PlanInterval.YEAR` |

## Usage Examples

### Complete Payment Flow

```typescript
import { PaymentRepository } from './modules/payment/payment.repository.js';

const paymentRepo = new PaymentRepository();

// 1. Create payment
const payment = await paymentRepo.createPayment({
  userId: 'user-123',
  provider: 'stripe',
  method: 'card',
  amount: 99.99,
  currency: 'USD',
  description: 'Premium subscription - Annual',
  providerPaymentId: 'pi_stripe_abc123',
});

// 2. Process payment (handled by provider webhook)
// When Stripe sends webhook: payment_intent.succeeded

// 3. Update payment status
await paymentRepo.updatePaymentStatus(payment.id, 'completed', {
  paidAt: new Date(),
});

// 4. If refund needed
await paymentRepo.updatePaymentStatus(payment.id, 'refunded', {
  refundedAmount: 99.99,
});
```

### Subscription Management

```typescript
// 1. Create plan
const plan = await paymentRepo.createPlan({
  name: 'Pro Plan',
  amount: 19.99,
  currency: 'USD',
  interval: 'month',
  intervalCount: 1,
  trialDays: 14,
  features: ['Unlimited projects', '24/7 support', 'Advanced analytics'],
});

// 2. Subscribe user
const currentPeriodStart = new Date();
const currentPeriodEnd = new Date();
currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

const subscription = await paymentRepo.createSubscription({
  userId: 'user-123',
  planId: plan.id,
  provider: 'stripe',
  currentPeriodStart,
  currentPeriodEnd,
  providerSubscriptionId: 'sub_stripe_xyz789',
});

// 3. User wants to cancel
await paymentRepo.cancelSubscription(subscription.id);
// Will cancel at period end

// 4. Check user subscriptions
const userSubs = await paymentRepo.findUserSubscriptions('user-123');
console.log(`Active subscriptions: ${userSubs.filter(s => s.status === 'active').length}`);
```

### Admin Dashboard - Payment Analytics

```typescript
// Get completed payments for last month
const lastMonth = new Date();
lastMonth.setMonth(lastMonth.getMonth() - 1);

const result = await paymentRepo.findPayments(
  { page: 1, limit: 100 },
  {
    status: 'completed',
    startDate: lastMonth,
    endDate: new Date(),
  }
);

// Calculate revenue
const totalRevenue = result.data.reduce((sum, payment) => sum + payment.amount, 0);
console.log(`Revenue: $${totalRevenue.toFixed(2)}`);

// Count by provider
const stripeCount = await paymentRepo.countPayments({
  provider: 'stripe',
  status: 'completed',
});

const paypalCount = await paymentRepo.countPayments({
  provider: 'paypal',
  status: 'completed',
});

console.log(`Stripe: ${stripeCount}, PayPal: ${paypalCount}`);
```

### Webhook Handling

```typescript
// Store webhook for processing
const webhook = await paymentRepo.storeWebhookEvent({
  provider: 'stripe',
  type: 'payment_intent.succeeded',
  data: {
    id: 'pi_stripe_123',
    amount: 9999,
    currency: 'usd',
    status: 'succeeded',
  },
});

try {
  // Process webhook
  const payment = await paymentRepo.findPaymentByProviderPaymentId('pi_stripe_123');
  if (payment) {
    await paymentRepo.updatePaymentStatus(payment.id, 'completed', {
      paidAt: new Date(),
    });
  }

  // Mark as processed
  await paymentRepo.markWebhookProcessed(webhook.id);
} catch (error) {
  // Mark as failed
  await paymentRepo.markWebhookProcessed(webhook.id, error.message);
}
```

## Migration from In-Memory

**Previous implementation** (v0.1.0):
```typescript
// ❌ OLD: In-memory storage
const payments = new Map<string, Payment>();
const subscriptions = new Map<string, Subscription>();
const plans = new Map<string, Plan>();
```

**Current implementation** (v0.2.0):
```typescript
// ✅ NEW: Prisma ORM
await prisma.payment.create({ data: { ... } });
await prisma.subscription.create({ data: { ... } });
await prisma.plan.create({ data: { ... } });
```

### Migration Steps

1. **Backup existing data** (if migrating from production):
   ```bash
   # Export in-memory data to JSON before migration
   ```

2. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

3. **Verify schema**:
   ```bash
   npm run db:generate
   ```

4. **Import data** (if needed):
   ```typescript
   // Bulk import payments, subscriptions, and plans
   ```

## Performance Considerations

### Indexes

The Payment tables have indexes on:
- `userId` - Fast user payment lookups
- `provider` - Filter by payment provider
- `status` - Filter by payment status
- `createdAt` - Date range queries
- `providerPaymentId` - Provider webhook lookups (unique)

### Query Optimization

- Use `findPaymentByProviderPaymentId()` for webhook processing (indexed)
- Leverage pagination for large result sets
- Filter by date ranges for analytics
- Use `countPayments()` for statistics instead of loading all data

### Financial Data Best Practices

- **Use Decimal/Float carefully**: Store amounts in smallest unit (cents) or use Decimal type
- **Idempotency**: Check `providerPaymentId` before creating duplicate payments
- **Audit trail**: Never delete payments, update status instead
- **Currency precision**: Always store currency code with amount
- **Refunds**: Track original amount and refunded amount separately

## Security Considerations

### PCI Compliance

- **Never store**: Card numbers, CVV, expiration dates
- **Store only**: Provider payment IDs and customer IDs
- **Use**: Provider-hosted payment forms (Stripe Elements, PayPal Checkout)

### Webhook Security

- **Verify signatures**: Always validate webhook signatures
- **Idempotency**: Check if webhook already processed
- **Error handling**: Store failed webhooks for manual review

```typescript
// Example webhook verification (Stripe)
const event = stripe.webhooks.constructEvent(
  payload,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);

// Store and process
const webhook = await paymentRepo.storeWebhookEvent({
  provider: 'stripe',
  type: event.type,
  data: event.data.object,
});
```

## Production Checklist

- [x] Prisma client generated (`npm run db:generate`)
- [x] Migrations applied (`npm run db:migrate`)
- [ ] Webhook endpoints configured with providers
- [ ] Provider API keys stored securely (environment variables)
- [ ] Webhook signature verification enabled
- [ ] Payment failure notifications configured
- [ ] Refund process documented
- [ ] Currency conversion handled (if multi-currency)
- [ ] Tax calculation implemented (if applicable)
- [ ] Backup and disaster recovery plan

## Troubleshooting

### \"Payment not found\" after webhook

**Problem**: Webhook received but payment doesn't exist in database.

**Solution**:
1. Check `providerPaymentId` matches
2. Verify webhook ordering (create before update)
3. Check if payment creation failed

### \"Duplicate payment\" error

**Problem**: Same payment created twice.

**Solution**:
- Use `providerPaymentId` (unique constraint)
- Check idempotency keys
- Verify webhook deduplication

### \"Subscription not cancelling\"

**Problem**: `cancelAtPeriodEnd` set but still active.

**Solution**:
- This is correct behavior - subscription remains active until period ends
- Use cron job to check expired subscriptions and update status

## Testing

Run payment repository tests:
```bash
# All payment tests
npm test tests/integration/payment-prisma.test.ts

# With coverage
npm run test:coverage -- tests/integration/payment-prisma.test.ts
```

**Test coverage:** 100% (all CRUD operations, filtering, pagination, enum mapping, webhooks)

## Related Modules

- **Auth Module**: User authentication for payment authorization
- **Notification Module**: Payment confirmations and receipts
- **Webhook Module**: Generic webhook handling
- **Audit Module**: Track payment events

## API Reference

See `src/modules/payment/types.ts` for complete type definitions.

## Changelog

### v0.2.0 (2025-12-19)

**PAYMENT-001 Completed:**
- ✅ Migrated from `Map<>` to Prisma ORM
- ✅ Added full test coverage (45+ integration tests)
- ✅ Implemented enum mapping (Prisma ↔ Application)
- ✅ Added subscription and plan management
- ✅ Implemented webhook storage and tracking
- ✅ Preserved API compatibility
- ✅ Added this documentation

### v0.1.0 (Initial)

- In-memory storage with Map<>
- Basic payment operations
- No persistence across restarts
- Limited provider support
