export type FlagStatus = 'enabled' | 'disabled';
export type FlagStrategy = 'boolean' | 'percentage' | 'user-list' | 'user-attribute' | 'date-range';
export type FlagEnvironment = 'development' | 'staging' | 'production' | 'test';

export interface FeatureFlag {
  /** Unique flag key */
  key: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Status */
  status: FlagStatus;
  /** Rollout strategy */
  strategy: FlagStrategy;
  /** Strategy configuration */
  config: FlagConfig;
  /** Environment */
  environment?: FlagEnvironment;
  /** Created by user ID */
  createdBy?: string;
  /** Created at timestamp */
  createdAt: Date;
  /** Updated at timestamp */
  updatedAt: Date;
  /** Tags for organization */
  tags?: string[];
}

export interface FlagConfig {
  /** Boolean value for boolean strategy */
  value?: boolean;
  /** Percentage (0-100) for percentage rollout */
  percentage?: number;
  /** List of user IDs for user-list strategy */
  userIds?: string[];
  /** User attribute rules */
  userAttributes?: UserAttributeRule[];
  /** Date range for time-based flags */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Custom data */
  customData?: Record<string, unknown>;
}

export interface UserAttributeRule {
  /** Attribute key (e.g., 'role', 'country', 'plan') */
  attribute: string;
  /** Operator */
  operator:
    | 'eq'
    | 'ne'
    | 'in'
    | 'nin'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'contains'
    | 'starts-with'
    | 'ends-with';
  /** Value to compare */
  value: string | number | string[] | number[];
}

export interface FlagEvaluationContext {
  /** User ID */
  userId?: string;
  /** User attributes */
  userAttributes?: Record<string, string | number | boolean>;
  /** Environment */
  environment?: FlagEnvironment;
  /** Session ID for consistent percentage rollout */
  sessionId?: string;
  /** Custom context data */
  customData?: Record<string, unknown>;
}

export interface FlagEvaluationResult {
  /** Flag key */
  key: string;
  /** Is flag enabled for this context */
  enabled: boolean;
  /** Reason for the decision */
  reason: string;
  /** Variant (for A/B testing) */
  variant?: string;
  /** Strategy used */
  strategy: FlagStrategy;
  /** Evaluation timestamp */
  evaluatedAt: Date;
}

export interface FlagVariant {
  /** Variant key */
  key: string;
  /** Display name */
  name: string;
  /** Weight for distribution (0-100) */
  weight: number;
  /** Variant configuration */
  config?: Record<string, unknown>;
}

export interface FlagStats {
  /** Total evaluations */
  totalEvaluations: number;
  /** Enabled evaluations */
  enabledCount: number;
  /** Disabled evaluations */
  disabledCount: number;
  /** Unique users */
  uniqueUsers: number;
  /** Evaluations by variant */
  variantDistribution?: Record<string, number>;
  /** Last evaluation */
  lastEvaluatedAt?: Date;
}

export interface FlagOverride {
  /** User ID or session ID */
  targetId: string;
  /** Target type */
  targetType: 'user' | 'session';
  /** Override value */
  enabled: boolean;
  /** Expiration date */
  expiresAt?: Date;
  /** Created at */
  createdAt: Date;
}

export interface FlagEvent {
  /** Event type */
  type: 'created' | 'updated' | 'deleted' | 'evaluated' | 'override-set' | 'override-removed';
  /** Flag key */
  flagKey: string;
  /** User ID */
  userId?: string;
  /** Event data */
  data?: Record<string, unknown>;
  /** Timestamp */
  timestamp: Date;
}

export interface FeatureFlagConfig {
  /** Default environment */
  defaultEnvironment?: FlagEnvironment;
  /** Enable analytics */
  analytics?: boolean;
  /** Cache TTL in seconds */
  cacheTtl?: number;
  /** Redis URL for distributed caching */
  redisUrl?: string;
}

export interface FlagListFilters {
  /** Filter by status */
  status?: FlagStatus;
  /** Filter by environment */
  environment?: FlagEnvironment;
  /** Filter by tags */
  tags?: string[];
  /** Search by name or description */
  search?: string;
}

export interface ABTestConfig {
  /** Flag key */
  flagKey: string;
  /** Variants */
  variants: FlagVariant[];
  /** Traffic allocation percentage */
  trafficAllocation: number;
  /** Conversion goal event */
  conversionGoal?: string;
}

export interface ABTestResult {
  /** Variant key */
  variant: string;
  /** Impressions */
  impressions: number;
  /** Conversions */
  conversions: number;
  /** Conversion rate */
  conversionRate: number;
  /** Statistical significance */
  isSignificant: boolean;
}
