import { logger } from '../../core/logger.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import type {
  FeatureFlag,
  FlagEvaluationContext,
  FlagEvaluationResult,
  FlagStats,
  FlagOverride,
  FlagEvent,
  FeatureFlagConfig,
  FlagListFilters,
  FlagConfig,
  UserAttributeRule,
} from './types.js';

/**
 * Feature Flag Service
 * A/B testing and progressive rollout
 */
export class FeatureFlagService {
  private flags = new Map<string, FeatureFlag>();
  private overrides = new Map<string, Map<string, FlagOverride>>();
  private stats = new Map<string, FlagStats>();
  private events: FlagEvent[] = [];
  private config: FeatureFlagConfig;

  constructor(config: FeatureFlagConfig = {}) {
    this.config = {
      defaultEnvironment: 'development',
      analytics: true,
      cacheTtl: 300,
      ...config,
    };

    logger.info('Feature flag service initialized');
  }

  /**
   * Create a feature flag
   */
  async createFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    if (this.flags.has(flag.key)) {
      throw new BadRequestError(`Flag with key "${flag.key}" already exists`);
    }

    const newFlag: FeatureFlag = {
      ...flag,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.flags.set(flag.key, newFlag);

    // Initialize stats
    this.stats.set(flag.key, {
      totalEvaluations: 0,
      enabledCount: 0,
      disabledCount: 0,
      uniqueUsers: 0,
    });

    this.logEvent({
      type: 'created',
      flagKey: flag.key,
      userId: flag.createdBy,
      data: { flag: newFlag },
      timestamp: new Date(),
    });

    logger.info({ flagKey: flag.key }, 'Feature flag created');

    return newFlag;
  }

  /**
   * Update a feature flag
   */
  async updateFlag(key: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const flag = this.flags.get(key);

    if (!flag) {
      throw new NotFoundError(`Flag "${key}" not found`);
    }

    const updatedFlag: FeatureFlag = {
      ...flag,
      ...updates,
      key: flag.key, // Prevent key change
      createdAt: flag.createdAt,
      updatedAt: new Date(),
    };

    this.flags.set(key, updatedFlag);

    this.logEvent({
      type: 'updated',
      flagKey: key,
      data: { updates },
      timestamp: new Date(),
    });

    logger.info({ flagKey: key }, 'Feature flag updated');

    return updatedFlag;
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(key: string): Promise<void> {
    const flag = this.flags.get(key);

    if (!flag) {
      throw new NotFoundError(`Flag "${key}" not found`);
    }

    this.flags.delete(key);
    this.overrides.delete(key);
    this.stats.delete(key);

    this.logEvent({
      type: 'deleted',
      flagKey: key,
      timestamp: new Date(),
    });

    logger.info({ flagKey: key }, 'Feature flag deleted');
  }

  /**
   * Get a feature flag
   */
  async getFlag(key: string): Promise<FeatureFlag> {
    const flag = this.flags.get(key);

    if (!flag) {
      throw new NotFoundError(`Flag "${key}" not found`);
    }

    return flag;
  }

  /**
   * List feature flags
   */
  async listFlags(filters?: FlagListFilters): Promise<FeatureFlag[]> {
    let flags = Array.from(this.flags.values());

    // Apply filters
    if (filters) {
      if (filters.status) {
        flags = flags.filter((f) => f.status === filters.status);
      }

      if (filters.environment) {
        flags = flags.filter((f) => f.environment === filters.environment);
      }

      if (filters.tags && filters.tags.length > 0) {
        flags = flags.filter((f) => f.tags?.some((t) => filters.tags!.includes(t)));
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        flags = flags.filter(
          (f) =>
            f.name.toLowerCase().includes(searchLower) ||
            f.description?.toLowerCase().includes(searchLower)
        );
      }
    }

    return flags;
  }

  /**
   * Evaluate a feature flag
   */
  async evaluateFlag(key: string, context: FlagEvaluationContext): Promise<FlagEvaluationResult> {
    const flag = this.flags.get(key);

    if (!flag) {
      throw new NotFoundError(`Flag "${key}" not found`);
    }

    // Check environment match
    if (flag.environment && context.environment && flag.environment !== context.environment) {
      return this.createResult(key, false, 'Environment mismatch', flag.strategy);
    }

    // Check for overrides
    const override = this.getOverride(key, context);
    if (override) {
      return this.createResult(key, override.enabled, 'Override active', flag.strategy);
    }

    // Check if flag is disabled
    if (flag.status === 'disabled') {
      return this.createResult(key, false, 'Flag disabled', flag.strategy);
    }

    // Evaluate based on strategy
    let enabled = false;
    let reason = '';

    switch (flag.strategy) {
      case 'boolean':
        enabled = flag.config.value ?? false;
        reason = enabled ? 'Boolean: true' : 'Boolean: false';
        break;

      case 'percentage':
        enabled = this.evaluatePercentage(flag.config, context);
        reason = `Percentage rollout: ${flag.config.percentage}%`;
        break;

      case 'user-list':
        enabled = this.evaluateUserList(flag.config, context);
        reason = enabled ? 'User in whitelist' : 'User not in whitelist';
        break;

      case 'user-attribute':
        enabled = this.evaluateUserAttributes(flag.config, context);
        reason = enabled ? 'User attributes match' : 'User attributes do not match';
        break;

      case 'date-range':
        enabled = this.evaluateDateRange(flag.config);
        reason = enabled ? 'Within date range' : 'Outside date range';
        break;
    }

    // Track statistics
    this.trackEvaluation(key, enabled, context);

    // Log event
    this.logEvent({
      type: 'evaluated',
      flagKey: key,
      userId: context.userId,
      data: { enabled, reason, context },
      timestamp: new Date(),
    });

    return this.createResult(key, enabled, reason, flag.strategy);
  }

  /**
   * Evaluate multiple flags at once
   */
  async evaluateFlags(
    keys: string[],
    context: FlagEvaluationContext
  ): Promise<Record<string, FlagEvaluationResult>> {
    const results: Record<string, FlagEvaluationResult> = {};

    for (const key of keys) {
      try {
        results[key] = await this.evaluateFlag(key, context);
      } catch (error) {
        logger.error({ key, error }, 'Failed to evaluate flag');
        results[key] = this.createResult(key, false, 'Evaluation error', 'boolean');
      }
    }

    return results;
  }

  /**
   * Check if a flag is enabled (simplified)
   */
  async isEnabled(key: string, context: FlagEvaluationContext): Promise<boolean> {
    const result = await this.evaluateFlag(key, context);
    return result.enabled;
  }

  /**
   * Set override for specific user/session
   */
  async setOverride(
    flagKey: string,
    targetId: string,
    targetType: 'user' | 'session',
    enabled: boolean,
    expiresAt?: Date
  ): Promise<void> {
    const flag = this.flags.get(flagKey);

    if (!flag) {
      throw new NotFoundError(`Flag "${flagKey}" not found`);
    }

    if (!this.overrides.has(flagKey)) {
      this.overrides.set(flagKey, new Map());
    }

    const flagOverrides = this.overrides.get(flagKey)!;
    flagOverrides.set(targetId, {
      targetId,
      targetType,
      enabled,
      expiresAt,
      createdAt: new Date(),
    });

    this.logEvent({
      type: 'override-set',
      flagKey,
      userId: targetType === 'user' ? targetId : undefined,
      data: { targetId, targetType, enabled, expiresAt },
      timestamp: new Date(),
    });

    logger.debug({ flagKey, targetId }, 'Override set');
  }

  /**
   * Remove override
   */
  async removeOverride(flagKey: string, targetId: string): Promise<void> {
    const flagOverrides = this.overrides.get(flagKey);

    if (flagOverrides) {
      flagOverrides.delete(targetId);

      this.logEvent({
        type: 'override-removed',
        flagKey,
        data: { targetId },
        timestamp: new Date(),
      });

      logger.debug({ flagKey, targetId }, 'Override removed');
    }
  }

  /**
   * Get flag statistics
   */
  async getStats(key: string): Promise<FlagStats> {
    const stats = this.stats.get(key);

    if (!stats) {
      throw new NotFoundError(`Stats for flag "${key}" not found`);
    }

    return stats;
  }

  /**
   * Get all events for a flag
   */
  async getEvents(flagKey: string, limit = 100): Promise<FlagEvent[]> {
    return this.events.filter((e) => e.flagKey === flagKey).slice(-limit);
  }

  /**
   * Evaluate percentage rollout
   */
  private evaluatePercentage(config: FlagConfig, context: FlagEvaluationContext): boolean {
    if (!config.percentage) {
      return false;
    }

    // Use userId or sessionId for consistent hashing
    const id = context.userId || context.sessionId || '';
    const hash = this.hashString(id);
    const bucket = hash % 100;

    return bucket < config.percentage;
  }

  /**
   * Evaluate user list
   */
  private evaluateUserList(config: FlagConfig, context: FlagEvaluationContext): boolean {
    if (!config.userIds || !context.userId) {
      return false;
    }

    return config.userIds.includes(context.userId);
  }

  /**
   * Evaluate user attributes
   */
  private evaluateUserAttributes(config: FlagConfig, context: FlagEvaluationContext): boolean {
    if (!config.userAttributes || !context.userAttributes) {
      return false;
    }

    // All rules must match (AND logic)
    return config.userAttributes.every((rule) => this.evaluateAttributeRule(rule, context));
  }

  /**
   * Evaluate single attribute rule
   */
  private evaluateAttributeRule(rule: UserAttributeRule, context: FlagEvaluationContext): boolean {
    const userValue = context.userAttributes?.[rule.attribute];

    if (userValue === undefined) {
      return false;
    }

    switch (rule.operator) {
      case 'eq':
        return userValue === rule.value;
      case 'ne':
        return userValue !== rule.value;
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(userValue as string | number);
      case 'nin':
        return Array.isArray(rule.value) && !rule.value.includes(userValue as string | number);
      case 'gt':
        return typeof userValue === 'number' && userValue > (rule.value as number);
      case 'gte':
        return typeof userValue === 'number' && userValue >= (rule.value as number);
      case 'lt':
        return typeof userValue === 'number' && userValue < (rule.value as number);
      case 'lte':
        return typeof userValue === 'number' && userValue <= (rule.value as number);
      case 'contains':
        return typeof userValue === 'string' && userValue.includes(String(rule.value));
      case 'starts-with':
        return typeof userValue === 'string' && userValue.startsWith(String(rule.value));
      case 'ends-with':
        return typeof userValue === 'string' && userValue.endsWith(String(rule.value));
      default:
        return false;
    }
  }

  /**
   * Evaluate date range
   */
  private evaluateDateRange(config: FlagConfig): boolean {
    if (!config.dateRange) {
      return false;
    }

    const now = new Date();
    const start = new Date(config.dateRange.start);
    const end = new Date(config.dateRange.end);

    return now >= start && now <= end;
  }

  /**
   * Get override for context
   */
  private getOverride(flagKey: string, context: FlagEvaluationContext): FlagOverride | null {
    const flagOverrides = this.overrides.get(flagKey);

    if (!flagOverrides) {
      return null;
    }

    // Check user override
    if (context.userId) {
      const userOverride = flagOverrides.get(context.userId);
      if (userOverride && this.isOverrideValid(userOverride)) {
        return userOverride;
      }
    }

    // Check session override
    if (context.sessionId) {
      const sessionOverride = flagOverrides.get(context.sessionId);
      if (sessionOverride && this.isOverrideValid(sessionOverride)) {
        return sessionOverride;
      }
    }

    return null;
  }

  /**
   * Check if override is still valid
   */
  private isOverrideValid(override: FlagOverride): boolean {
    if (!override.expiresAt) {
      return true;
    }

    return new Date() < override.expiresAt;
  }

  /**
   * Track evaluation statistics
   */
  private trackEvaluation(key: string, enabled: boolean, context: FlagEvaluationContext): void {
    if (!this.config.analytics) {
      return;
    }

    const stats = this.stats.get(key);

    if (stats) {
      stats.totalEvaluations++;
      if (enabled) {
        stats.enabledCount++;
      } else {
        stats.disabledCount++;
      }

      if (context.userId) {
        stats.uniqueUsers++;
      }

      stats.lastEvaluatedAt = new Date();
    }
  }

  /**
   * Create evaluation result
   */
  private createResult(
    key: string,
    enabled: boolean,
    reason: string,
    strategy: FeatureFlag['strategy']
  ): FlagEvaluationResult {
    return {
      key,
      enabled,
      reason,
      strategy,
      evaluatedAt: new Date(),
    };
  }

  /**
   * Log event
   */
  private logEvent(event: FlagEvent): void {
    this.events.push(event);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events.shift();
    }
  }

  /**
   * Simple string hashing for consistent bucketing
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
