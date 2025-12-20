# Feature Flag Module

Feature flags for A/B testing, progressive rollouts, and feature management.

## Features

- **Multiple Strategies** - Boolean, percentage, user list, user attributes, date range
- **User Targeting** - Target specific users or user segments
- **Overrides** - Per-user or per-session overrides
- **Analytics** - Track flag evaluations and usage statistics
- **Environment Support** - Different flags per environment

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   Feature Flag Service                       │
├──────────────────────────────────────────────────────────────┤
│  Flag CRUD  │  Evaluation Engine  │  Override Mgmt  │  Stats │
└──────┬──────┴─────────┬───────────┴────────┬────────┴───┬────┘
       │                │                    │            │
       ▼                ▼                    ▼            ▼
┌──────────────────────────────────────────────────────────────┐
│               Prisma (Flags & Overrides)                     │
│               Redis (Statistics)                             │
└──────────────────────────────────────────────────────────────┘
```

## Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `boolean` | Simple on/off | Kill switches |
| `percentage` | Percentage rollout | Gradual releases |
| `user-list` | Specific user IDs | Beta testers |
| `user-attribute` | User property rules | Segment targeting |
| `date-range` | Time-based activation | Scheduled features |

## Usage

### Basic Setup

```typescript
import { createFeatureFlagService } from 'servcraft/modules/feature-flag';

const flagService = createFeatureFlagService({
  defaultEnvironment: 'production',
  analytics: true,
  cacheTtl: 300,
});
```

### Creating Flags

```typescript
// Boolean flag
await flagService.createFlag({
  key: 'new-dashboard',
  name: 'New Dashboard',
  description: 'Enable the redesigned dashboard',
  strategy: 'boolean',
  config: { value: false },
  status: 'active',
  environment: 'production',
});

// Percentage rollout
await flagService.createFlag({
  key: 'new-checkout',
  name: 'New Checkout Flow',
  strategy: 'percentage',
  config: { percentage: 25 }, // 25% of users
  status: 'active',
});

// User list (beta testers)
await flagService.createFlag({
  key: 'beta-features',
  name: 'Beta Features',
  strategy: 'user-list',
  config: { userIds: ['user-1', 'user-2', 'user-3'] },
  status: 'active',
});

// User attributes
await flagService.createFlag({
  key: 'premium-features',
  name: 'Premium Features',
  strategy: 'user-attribute',
  config: {
    userAttributes: [
      { attribute: 'plan', operator: 'in', value: ['pro', 'enterprise'] },
      { attribute: 'accountAge', operator: 'gte', value: 30 },
    ],
  },
  status: 'active',
});

// Date range
await flagService.createFlag({
  key: 'holiday-theme',
  name: 'Holiday Theme',
  strategy: 'date-range',
  config: {
    dateRange: {
      start: '2024-12-20T00:00:00Z',
      end: '2025-01-02T23:59:59Z',
    },
  },
  status: 'active',
});
```

### Evaluating Flags

```typescript
// Simple check
const isEnabled = await flagService.isEnabled('new-dashboard', {
  userId: 'user-123',
  environment: 'production',
});

// Full evaluation with reason
const result = await flagService.evaluateFlag('new-checkout', {
  userId: 'user-123',
  sessionId: 'session-456',
  environment: 'production',
  userAttributes: {
    plan: 'pro',
    accountAge: 45,
    country: 'US',
  },
});
// {
//   key: 'new-checkout',
//   enabled: true,
//   reason: 'Percentage rollout: 25%',
//   strategy: 'percentage',
//   evaluatedAt: Date
// }

// Evaluate multiple flags
const flags = await flagService.evaluateFlags(
  ['new-dashboard', 'new-checkout', 'beta-features'],
  { userId: 'user-123' }
);
// { 'new-dashboard': {...}, 'new-checkout': {...}, 'beta-features': {...} }
```

### Managing Flags

```typescript
// Update flag
await flagService.updateFlag('new-checkout', {
  config: { percentage: 50 }, // Increase to 50%
});

// Get flag
const flag = await flagService.getFlag('new-checkout');

// List flags
const allFlags = await flagService.listFlags({
  status: 'active',
  environment: 'production',
});

// Delete flag
await flagService.deleteFlag('old-feature');
```

### Overrides

```typescript
// Set user override (for testing/support)
await flagService.setOverride(
  'new-checkout',
  'user-123',
  'user',
  true, // force enabled
  new Date('2024-02-01') // expires
);

// Set session override
await flagService.setOverride('new-checkout', 'session-456', 'session', false);

// Remove override
await flagService.removeOverride('new-checkout', 'user-123');
```

### Statistics

```typescript
const stats = await flagService.getStats('new-checkout');
// {
//   totalEvaluations: 10000,
//   enabledCount: 2500,
//   disabledCount: 7500,
//   uniqueUsers: 5000,
//   lastEvaluatedAt: Date
// }

// Get events for a flag
const events = await flagService.getEvents('new-checkout', 100);
```

## Attribute Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `{ attribute: 'plan', operator: 'eq', value: 'pro' }` |
| `ne` | Not equals | `{ attribute: 'status', operator: 'ne', value: 'banned' }` |
| `in` | In array | `{ attribute: 'country', operator: 'in', value: ['US', 'CA'] }` |
| `nin` | Not in array | `{ attribute: 'role', operator: 'nin', value: ['guest'] }` |
| `gt` | Greater than | `{ attribute: 'age', operator: 'gt', value: 18 }` |
| `gte` | Greater or equal | `{ attribute: 'score', operator: 'gte', value: 100 }` |
| `lt` | Less than | `{ attribute: 'failedLogins', operator: 'lt', value: 5 }` |
| `lte` | Less or equal | `{ attribute: 'cart', operator: 'lte', value: 1000 }` |
| `contains` | String contains | `{ attribute: 'email', operator: 'contains', value: '@company.com' }` |
| `starts-with` | String starts with | `{ attribute: 'name', operator: 'starts-with', value: 'Admin' }` |
| `ends-with` | String ends with | `{ attribute: 'domain', operator: 'ends-with', value: '.edu' }` |

## Types

```typescript
interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  strategy: 'boolean' | 'percentage' | 'user-list' | 'user-attribute' | 'date-range';
  config: FlagConfig;
  status: 'active' | 'disabled' | 'archived';
  environment?: string;
  tags?: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FlagEvaluationContext {
  userId?: string;
  sessionId?: string;
  environment?: string;
  userAttributes?: Record<string, string | number | boolean>;
}

interface FlagEvaluationResult {
  key: string;
  enabled: boolean;
  reason: string;
  strategy: string;
  evaluatedAt: Date;
}
```

## React Integration Example

```typescript
// Hook
function useFeatureFlag(key: string): boolean {
  const [enabled, setEnabled] = useState(false);
  const user = useUser();

  useEffect(() => {
    flagService.isEnabled(key, {
      userId: user.id,
      userAttributes: {
        plan: user.plan,
        country: user.country,
      },
    }).then(setEnabled);
  }, [key, user]);

  return enabled;
}

// Usage
function Dashboard() {
  const showNewDashboard = useFeatureFlag('new-dashboard');

  return showNewDashboard ? <NewDashboard /> : <OldDashboard />;
}
```

## Best Practices

1. **Naming Convention** - Use kebab-case: `new-feature`, `beta-checkout`
2. **Short-lived Flags** - Remove flags after full rollout
3. **Default Off** - New flags should default to disabled
4. **Documentation** - Add descriptions to all flags
5. **Cleanup** - Archive unused flags regularly
6. **Testing** - Use overrides for testing specific states
