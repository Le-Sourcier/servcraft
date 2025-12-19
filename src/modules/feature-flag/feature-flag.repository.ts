/**
 * Feature Flag Repository
 * Prisma-based persistence for feature flags and overrides
 */
import { Prisma } from '@prisma/client';
import type {
  FeatureFlag as PrismaFeatureFlag,
  FlagOverride as PrismaFlagOverride,
  FeatureFlagStatus as PrismaFlagStatus,
  FlagStrategy as PrismaFlagStrategy,
  PrismaClient,
} from '@prisma/client';
import type {
  FeatureFlag,
  FlagOverride,
  FlagStatus,
  FlagStrategy,
  FlagListFilters,
  FlagConfig,
} from './types.js';

// Enum mappings
const statusToPrisma: Record<FlagStatus | 'archived', PrismaFlagStatus> = {
  enabled: 'ENABLED',
  disabled: 'DISABLED',
  archived: 'ARCHIVED',
};

const statusFromPrisma: Record<PrismaFlagStatus, FlagStatus> = {
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  ARCHIVED: 'disabled', // Map archived to disabled for app layer
};

const strategyToPrisma: Record<FlagStrategy, PrismaFlagStrategy> = {
  boolean: 'BOOLEAN',
  percentage: 'PERCENTAGE',
  'user-list': 'USER_LIST',
  'user-attribute': 'USER_ATTRIBUTE',
  'date-range': 'DATE_RANGE',
};

const strategyFromPrisma: Record<PrismaFlagStrategy, FlagStrategy> = {
  BOOLEAN: 'boolean',
  PERCENTAGE: 'percentage',
  USER_LIST: 'user-list',
  USER_ATTRIBUTE: 'user-attribute',
  DATE_RANGE: 'date-range',
};

export class FeatureFlagRepository {
  constructor(private prisma: PrismaClient) {}

  // ==========================================
  // FLAG METHODS
  // ==========================================

  async create(data: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    const flag = await this.prisma.featureFlag.create({
      data: {
        key: data.key,
        name: data.name,
        description: data.description,
        status: statusToPrisma[data.status],
        strategy: strategyToPrisma[data.strategy],
        config: data.config as Prisma.InputJsonValue,
        environment: data.environment,
        tags: data.tags || [],
        createdBy: data.createdBy,
      },
    });

    return this.mapFlagFromPrisma(flag);
  }

  async getByKey(key: string): Promise<FeatureFlag | null> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
    });

    return flag ? this.mapFlagFromPrisma(flag) : null;
  }

  async getById(id: string): Promise<FeatureFlag | null> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { id },
    });

    return flag ? this.mapFlagFromPrisma(flag) : null;
  }

  async list(filters?: FlagListFilters): Promise<FeatureFlag[]> {
    const where: Prisma.FeatureFlagWhereInput = {};

    if (filters?.status) {
      where.status = statusToPrisma[filters.status];
    }

    if (filters?.environment) {
      where.environment = filters.environment;
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const flags = await this.prisma.featureFlag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return flags.map((f) => this.mapFlagFromPrisma(f));
  }

  async update(
    key: string,
    data: Partial<Omit<FeatureFlag, 'key' | 'createdAt' | 'updatedAt'>>
  ): Promise<FeatureFlag | null> {
    try {
      const updateData: Prisma.FeatureFlagUpdateInput = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) updateData.status = statusToPrisma[data.status];
      if (data.strategy !== undefined) updateData.strategy = strategyToPrisma[data.strategy];
      if (data.config !== undefined) updateData.config = data.config as Prisma.InputJsonValue;
      if (data.environment !== undefined) updateData.environment = data.environment;
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.createdBy !== undefined) updateData.createdBy = data.createdBy;

      const flag = await this.prisma.featureFlag.update({
        where: { key },
        data: updateData,
      });

      return this.mapFlagFromPrisma(flag);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.prisma.featureFlag.delete({ where: { key } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  // ==========================================
  // OVERRIDE METHODS
  // ==========================================

  async createOverride(data: {
    flagKey: string;
    targetId: string;
    targetType: 'user' | 'session';
    enabled: boolean;
    expiresAt?: Date;
  }): Promise<FlagOverride> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key: data.flagKey },
      select: { id: true },
    });

    if (!flag) {
      throw new Error(`Flag "${data.flagKey}" not found`);
    }

    const override = await this.prisma.flagOverride.upsert({
      where: {
        flagId_targetId: {
          flagId: flag.id,
          targetId: data.targetId,
        },
      },
      create: {
        flagId: flag.id,
        targetId: data.targetId,
        targetType: data.targetType,
        enabled: data.enabled,
        expiresAt: data.expiresAt,
      },
      update: {
        enabled: data.enabled,
        expiresAt: data.expiresAt,
      },
    });

    return this.mapOverrideFromPrisma(override);
  }

  async getOverride(flagKey: string, targetId: string): Promise<FlagOverride | null> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key: flagKey },
      select: { id: true },
    });

    if (!flag) return null;

    const override = await this.prisma.flagOverride.findUnique({
      where: {
        flagId_targetId: {
          flagId: flag.id,
          targetId,
        },
      },
    });

    return override ? this.mapOverrideFromPrisma(override) : null;
  }

  async getOverridesForFlag(flagKey: string): Promise<FlagOverride[]> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key: flagKey },
      include: { overrides: true },
    });

    if (!flag) return [];

    return flag.overrides.map((o) => this.mapOverrideFromPrisma(o));
  }

  async deleteOverride(flagKey: string, targetId: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key: flagKey },
      select: { id: true },
    });

    if (!flag) return false;

    try {
      await this.prisma.flagOverride.delete({
        where: {
          flagId_targetId: {
            flagId: flag.id,
            targetId,
          },
        },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  async deleteExpiredOverrides(): Promise<number> {
    const result = await this.prisma.flagOverride.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }

  // ==========================================
  // MAPPING HELPERS
  // ==========================================

  private mapFlagFromPrisma(prismaFlag: PrismaFeatureFlag): FeatureFlag {
    return {
      key: prismaFlag.key,
      name: prismaFlag.name,
      description: prismaFlag.description || undefined,
      status: statusFromPrisma[prismaFlag.status],
      strategy: strategyFromPrisma[prismaFlag.strategy],
      config: prismaFlag.config as FlagConfig,
      environment: prismaFlag.environment as FeatureFlag['environment'],
      tags: prismaFlag.tags,
      createdBy: prismaFlag.createdBy || undefined,
      createdAt: prismaFlag.createdAt,
      updatedAt: prismaFlag.updatedAt,
    };
  }

  private mapOverrideFromPrisma(prismaOverride: PrismaFlagOverride): FlagOverride {
    return {
      targetId: prismaOverride.targetId,
      targetType: prismaOverride.targetType as 'user' | 'session',
      enabled: prismaOverride.enabled,
      expiresAt: prismaOverride.expiresAt || undefined,
      createdAt: prismaOverride.createdAt,
    };
  }
}
