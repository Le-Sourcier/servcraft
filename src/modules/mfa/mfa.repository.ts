/**
 * MFA Repository
 * Prisma-based persistence for user MFA settings
 */
import { Prisma } from '@prisma/client';
import type {
  UserMFA as PrismaUserMFA,
  MFAMethod as PrismaMFAMethod,
  PrismaClient,
} from '@prisma/client';
import type { UserMFA, MFAMethod } from './types.js';

// Enum mappings (Prisma UPPERCASE ↔ Application lowercase)
const methodToPrisma: Record<MFAMethod, PrismaMFAMethod> = {
  totp: 'TOTP',
  sms: 'SMS',
  email: 'EMAIL',
  backup_codes: 'BACKUP_CODES',
};

const methodFromPrisma: Record<PrismaMFAMethod, MFAMethod> = {
  TOTP: 'totp',
  SMS: 'sms',
  EMAIL: 'email',
  BACKUP_CODES: 'backup_codes',
};

export class MFARepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create MFA settings for a user
   */
  async create(data: Omit<UserMFA, 'createdAt' | 'updatedAt'>): Promise<UserMFA> {
    const mfa = await this.prisma.userMFA.create({
      data: {
        userId: data.userId,
        enabled: data.enabled,
        methods: data.methods.map((m) => methodToPrisma[m]),
        totpSecret: data.totpSecret,
        totpVerified: data.totpVerified,
        backupCodes: data.backupCodes as Prisma.InputJsonValue,
        backupCodesUsed: data.backupCodesUsed as Prisma.InputJsonValue,
        phoneNumber: data.phoneNumber,
        phoneVerified: data.phoneVerified,
        email: data.email,
        emailVerified: data.emailVerified,
        lastUsed: data.lastUsed,
      },
    });

    return this.mapFromPrisma(mfa);
  }

  /**
   * Get MFA settings by user ID
   */
  async getByUserId(userId: string): Promise<UserMFA | null> {
    const mfa = await this.prisma.userMFA.findUnique({
      where: { userId },
    });

    return mfa ? this.mapFromPrisma(mfa) : null;
  }

  /**
   * Update MFA settings
   */
  async update(
    userId: string,
    data: Partial<Omit<UserMFA, 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<UserMFA | null> {
    try {
      const updateData: Prisma.UserMFAUpdateInput = {};

      if (data.enabled !== undefined) updateData.enabled = data.enabled;
      if (data.methods !== undefined) {
        updateData.methods = data.methods.map((m) => methodToPrisma[m]);
      }
      if (data.totpSecret !== undefined) updateData.totpSecret = data.totpSecret;
      if (data.totpVerified !== undefined) updateData.totpVerified = data.totpVerified;
      if (data.backupCodes !== undefined) {
        updateData.backupCodes = data.backupCodes as Prisma.InputJsonValue;
      }
      if (data.backupCodesUsed !== undefined) {
        updateData.backupCodesUsed = data.backupCodesUsed as Prisma.InputJsonValue;
      }
      if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
      if (data.phoneVerified !== undefined) updateData.phoneVerified = data.phoneVerified;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.emailVerified !== undefined) updateData.emailVerified = data.emailVerified;
      if (data.lastUsed !== undefined) updateData.lastUsed = data.lastUsed;

      const mfa = await this.prisma.userMFA.update({
        where: { userId },
        data: updateData,
      });

      return this.mapFromPrisma(mfa);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Upsert MFA settings (create or update)
   */
  async upsert(data: Omit<UserMFA, 'createdAt' | 'updatedAt'>): Promise<UserMFA> {
    const mfa = await this.prisma.userMFA.upsert({
      where: { userId: data.userId },
      create: {
        userId: data.userId,
        enabled: data.enabled,
        methods: data.methods.map((m) => methodToPrisma[m]),
        totpSecret: data.totpSecret,
        totpVerified: data.totpVerified,
        backupCodes: data.backupCodes as Prisma.InputJsonValue,
        backupCodesUsed: data.backupCodesUsed as Prisma.InputJsonValue,
        phoneNumber: data.phoneNumber,
        phoneVerified: data.phoneVerified,
        email: data.email,
        emailVerified: data.emailVerified,
        lastUsed: data.lastUsed,
      },
      update: {
        enabled: data.enabled,
        methods: data.methods.map((m) => methodToPrisma[m]),
        totpSecret: data.totpSecret,
        totpVerified: data.totpVerified,
        backupCodes: data.backupCodes as Prisma.InputJsonValue,
        backupCodesUsed: data.backupCodesUsed as Prisma.InputJsonValue,
        phoneNumber: data.phoneNumber,
        phoneVerified: data.phoneVerified,
        email: data.email,
        emailVerified: data.emailVerified,
        lastUsed: data.lastUsed,
      },
    });

    return this.mapFromPrisma(mfa);
  }

  /**
   * Delete MFA settings for a user
   */
  async delete(userId: string): Promise<boolean> {
    try {
      await this.prisma.userMFA.delete({ where: { userId } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if MFA is enabled for a user
   */
  async isEnabled(userId: string): Promise<boolean> {
    const mfa = await this.prisma.userMFA.findUnique({
      where: { userId },
      select: { enabled: true },
    });

    return mfa?.enabled ?? false;
  }

  /**
   * Get enabled methods for a user
   */
  async getEnabledMethods(userId: string): Promise<MFAMethod[]> {
    const mfa = await this.prisma.userMFA.findUnique({
      where: { userId },
      select: { methods: true },
    });

    return mfa?.methods.map((m) => methodFromPrisma[m]) ?? [];
  }

  /**
   * Map Prisma model to application type
   */
  private mapFromPrisma(prismaMfa: PrismaUserMFA): UserMFA {
    return {
      userId: prismaMfa.userId,
      enabled: prismaMfa.enabled,
      methods: prismaMfa.methods.map((m) => methodFromPrisma[m]),
      totpSecret: prismaMfa.totpSecret || undefined,
      totpVerified: prismaMfa.totpVerified,
      backupCodes: (prismaMfa.backupCodes as string[]) || undefined,
      backupCodesUsed: (prismaMfa.backupCodesUsed as string[]) || undefined,
      phoneNumber: prismaMfa.phoneNumber || undefined,
      phoneVerified: prismaMfa.phoneVerified,
      email: prismaMfa.email || undefined,
      emailVerified: prismaMfa.emailVerified,
      lastUsed: prismaMfa.lastUsed || undefined,
      createdAt: prismaMfa.createdAt,
      updatedAt: prismaMfa.updatedAt,
    };
  }
}
