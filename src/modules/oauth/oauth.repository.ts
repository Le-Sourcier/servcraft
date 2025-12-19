/**
 * OAuth Repository
 * Prisma-based persistence for linked OAuth accounts
 */
import { Prisma } from '@prisma/client';
import type {
  LinkedAccount as PrismaLinkedAccount,
  OAuthProvider as PrismaOAuthProvider,
  PrismaClient,
} from '@prisma/client';
import type { LinkedAccount, OAuthProvider } from './types.js';

// Enum mappings (Prisma UPPERCASE ↔ Application lowercase)
const providerToPrisma: Record<OAuthProvider, PrismaOAuthProvider> = {
  google: 'GOOGLE',
  facebook: 'FACEBOOK',
  github: 'GITHUB',
  twitter: 'TWITTER',
  apple: 'APPLE',
};

const providerFromPrisma: Record<PrismaOAuthProvider, OAuthProvider> = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  GITHUB: 'github',
  TWITTER: 'twitter',
  APPLE: 'apple',
};

export class OAuthRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a linked account
   */
  async create(
    data: Omit<LinkedAccount, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LinkedAccount> {
    const account = await this.prisma.linkedAccount.create({
      data: {
        userId: data.userId,
        provider: providerToPrisma[data.provider],
        providerAccountId: data.providerAccountId,
        email: data.email,
        name: data.name,
        picture: data.picture,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      },
    });

    return this.mapFromPrisma(account);
  }

  /**
   * Get linked account by ID
   */
  async getById(id: string): Promise<LinkedAccount | null> {
    const account = await this.prisma.linkedAccount.findUnique({
      where: { id },
    });

    return account ? this.mapFromPrisma(account) : null;
  }

  /**
   * Find linked account by provider and provider account ID
   */
  async findByProviderAccount(
    provider: OAuthProvider,
    providerAccountId: string
  ): Promise<LinkedAccount | null> {
    const account = await this.prisma.linkedAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: providerToPrisma[provider],
          providerAccountId,
        },
      },
    });

    return account ? this.mapFromPrisma(account) : null;
  }

  /**
   * Get all linked accounts for a user
   */
  async getByUserId(userId: string): Promise<LinkedAccount[]> {
    const accounts = await this.prisma.linkedAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((a) => this.mapFromPrisma(a));
  }

  /**
   * Get linked account by user and provider
   */
  async getByUserAndProvider(
    userId: string,
    provider: OAuthProvider
  ): Promise<LinkedAccount | null> {
    const account = await this.prisma.linkedAccount.findFirst({
      where: {
        userId,
        provider: providerToPrisma[provider],
      },
    });

    return account ? this.mapFromPrisma(account) : null;
  }

  /**
   * Update linked account
   */
  async update(
    id: string,
    data: Partial<
      Pick<
        LinkedAccount,
        'email' | 'name' | 'picture' | 'accessToken' | 'refreshToken' | 'expiresAt'
      >
    >
  ): Promise<LinkedAccount | null> {
    try {
      const updateData: Prisma.LinkedAccountUpdateInput = {};

      if (data.email !== undefined) updateData.email = data.email;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.picture !== undefined) updateData.picture = data.picture;
      if (data.accessToken !== undefined) updateData.accessToken = data.accessToken;
      if (data.refreshToken !== undefined) updateData.refreshToken = data.refreshToken;
      if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;

      const account = await this.prisma.linkedAccount.update({
        where: { id },
        data: updateData,
      });

      return this.mapFromPrisma(account);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete linked account by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.linkedAccount.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete linked account by user and provider
   */
  async deleteByUserAndProvider(userId: string, provider: OAuthProvider): Promise<boolean> {
    const result = await this.prisma.linkedAccount.deleteMany({
      where: {
        userId,
        provider: providerToPrisma[provider],
      },
    });

    return result.count > 0;
  }

  /**
   * Delete all linked accounts for a user
   */
  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.prisma.linkedAccount.deleteMany({
      where: { userId },
    });

    return result.count;
  }

  /**
   * Count linked accounts for a user
   */
  async countByUser(userId: string): Promise<number> {
    return this.prisma.linkedAccount.count({
      where: { userId },
    });
  }

  /**
   * Map Prisma model to application type
   */
  private mapFromPrisma(prismaAccount: PrismaLinkedAccount): LinkedAccount {
    return {
      id: prismaAccount.id,
      userId: prismaAccount.userId,
      provider: providerFromPrisma[prismaAccount.provider],
      providerAccountId: prismaAccount.providerAccountId,
      email: prismaAccount.email || undefined,
      name: prismaAccount.name || undefined,
      picture: prismaAccount.picture || undefined,
      accessToken: prismaAccount.accessToken || undefined,
      refreshToken: prismaAccount.refreshToken || undefined,
      expiresAt: prismaAccount.expiresAt || undefined,
      createdAt: prismaAccount.createdAt,
      updatedAt: prismaAccount.updatedAt,
    };
  }
}
