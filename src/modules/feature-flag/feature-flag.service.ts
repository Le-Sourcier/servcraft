/**
 * Feature Flag Service
 * A/B testing and progressive rollout
 *
 * Persistence:
 * - Flags: Prisma/PostgreSQL (persistent)
 * - Overrides: Prisma/PostgreSQL (persistent)
 * - Stats: Redis with TTL (temporary, for performance)
 * - Events: In-memory circular buffer (runtime only)
 */
import { logger } from '../../core/logger.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { prisma } from '../../database/prisma.js';
import { getRedis } from '../../database/redis.js';
import { FeatureFlagRepository } from './feature-flag.repository.js';
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

const FLAG_STATS_PREFIX = 'flagstats:';
const FLAG_STATS_TTL = 86400; // 24 hours

export class FeatureFlagService {
  private repository: FeatureFlagRepository;
  private events: FlagEvent[] = [];
  private config: FeatureFlagConfig;

  constructor(config: FeatureFlagConfig = {}) {
    this.config = {
      defaultEnvironment: 'development',
      analytics: true,
      cacheTtl: 300,
      ...config,
    };
    this.repository = new FeatureFlagRepository(prisma);

    logger.info('Feature flag service initialized');
  }

  /**
   * Create a feature flag
   */
  async createFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    const existing = await this.repository.getByKey(flag.key);
    if (existing) {
      throw new BadRequestError(`Flag with key "${flag.key}" already exists`);
    }

    const newFlag = await this.repository.create(flag);

    // Initialize stats in Redis
    await this.initializeStats(flag.key);

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
    const flag = await this.repository.update(key, updates);

    if (!flag) {
      throw new NotFoundError(`Flag "${key}" not found`);
    }

    this.logEvent({
      type: 'updated',
      flagKey: key,
      data: { updates },
      timestamp: new Date(),
    });

    logger.info({ flagKey: key }, 'Feature flag updated');

    return flag;
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(key: string): Promise<void> {
    const deleted = await this.repository.delete(key);

    if (!deleted) {
      throw new NotFoundError(`Flag "${key}" not found`);
    }

    // Clean up stats
    const redis = getRedis();
    await redis.del(`${FLAG_STATS_PREFIX}${key}`);

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
    const flag = await this.repository.getByKey(key);

    if (!flag) {
      throw new NotFoundError(`Flag "${key}" not found`);
    }

    return flag;
  }

  /**
   * List feature flags
   */
  async listFlags(filters?: FlagListFilters): Promise<FeatureFlag[]> {
    return this.repository.list(filters);
  }

  /**
   * Evaluate a feature flag
   */
  async evaluateFlag(key: string, context: FlagEvaluationContext): Promise<FlagEvaluationResult> {
    const flag = await this.repository.getByKey(key);

    if (!flag) {
      throw new NotFoundError(`Flag "${key}" not found`);
    }

    // Check environment match
    if (flag.environment && context.environment && flag.environment !== context.environment) {
      return this.createResult(key, false, 'Environment mismatch', flag.strategy);
    }

    // Check for overrides
    const override = await this.getOverride(key, context);
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
    await this.trackEvaluation(key, enabled, context);

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
    // Verify flag exists
    const flag = await this.repository.getByKey(flagKey);
    if (!flag) {
      throw new NotFoundError(`Flag "${flagKey}" not found`);
    }

    await this.repository.createOverride({
      flagKey,
      targetId,
      targetType,
      enabled,
      expiresAt,
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
    const deleted = await this.repository.deleteOverride(flagKey, targetId);

    if (deleted) {
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
    const redis = getRedis();
    const statsJson = await redis.get(`${FLAG_STATS_PREFIX}${key}`);

    if (!statsJson) {
      return {
        totalEvaluations: 0,
        enabledCount: 0,
        disabledCount: 0,
        uniqueUsers: 0,
      };
    }

    return JSON.parse(statsJson) as FlagStats;
  }

  /**
   * Get all events for a flag
   */
  async getEvents(flagKey: string, limit = 100): Promise<FlagEvent[]> {
    return this.events.filter((e) => e.flagKey === flagKey).slice(-limit);
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Get override for context
   */
  private async getOverride(
    flagKey: string,
    context: FlagEvaluationContext
  ): Promise<FlagOverride | null> {
    // Check user override
    if (context.userId) {
      const userOverride = await this.repository.getOverride(flagKey, context.userId);
      if (userOverride && this.isOverrideValid(userOverride)) {
        return userOverride;
      }
    }

    // Check session override
    if (context.sessionId) {
      const sessionOverride = await this.repository.getOverride(flagKey, context.sessionId);
      if (sessionOverride && this.isOverrideValid(sessionOverride)) {
        return sessionOverride;
      }
    }

    return null;
  }

  private isOverrideValid(override: FlagOverride): boolean {
    if (!override.expiresAt) {
      return true;
    }
    return new Date() < override.expiresAt;
  }

  /**
   * Evaluate percentage rollout
   */
  private evaluatePercentage(config: FlagConfig, context: FlagEvaluationContext): boolean {
    if (!config.percentage) {
      return false;
    }

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

    return config.userAttributes.every((rule) => this.evaluateAttributeRule(rule, context));
  }

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
        return (
          Array.isArray(rule.value) &&
          (rule.value as (string | number)[]).includes(userValue as string | number)
        );
      case 'nin':
        return (
          Array.isArray(rule.value) &&
          !(rule.value as (string | number)[]).includes(userValue as string | number)
        );
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
   * Initialize stats for a flag
   */
  private async initializeStats(key: string): Promise<void> {
    const stats: FlagStats = {
      totalEvaluations: 0,
      enabledCount: 0,
      disabledCount: 0,
      uniqueUsers: 0,
    };

    const redis = getRedis();
    await redis.setex(`${FLAG_STATS_PREFIX}${key}`, FLAG_STATS_TTL, JSON.stringify(stats));
  }

  /**
   * Track evaluation statistics
   */
  private async trackEvaluation(
    key: string,
    enabled: boolean,
    context: FlagEvaluationContext
  ): Promise<void> {
    if (!this.config.analytics) {
      return;
    }

    try {
      const redis = getRedis();
      const statsJson = await redis.get(`${FLAG_STATS_PREFIX}${key}`);

      const stats: FlagStats = statsJson
        ? JSON.parse(statsJson)
        : {
            totalEvaluations: 0,
            enabledCount: 0,
            disabledCount: 0,
            uniqueUsers: 0,
          };

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

      await redis.setex(`${FLAG_STATS_PREFIX}${key}`, FLAG_STATS_TTL, JSON.stringify(stats));
    } catch (error) {
      logger.warn({ err: error, key }, 'Failed to track flag evaluation');
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

    // Keep only last 1000 events (circular buffer)
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
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

let featureFlagService: FeatureFlagService | null = null;

export function getFeatureFlagService(): FeatureFlagService {
  if (!featureFlagService) {
    featureFlagService = new FeatureFlagService();
  }
  return featureFlagService;
}

export function createFeatureFlagService(config?: FeatureFlagConfig): FeatureFlagService {
  featureFlagService = new FeatureFlagService(config);
  return featureFlagService;
}
