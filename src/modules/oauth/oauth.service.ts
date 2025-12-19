/**
 * OAuth Service
 * Handles OAuth authentication with multiple providers
 *
 * Persistence:
 * - OAuth states: Redis with TTL (temporary, 10-minute expiration)
 * - Linked accounts: Prisma/PostgreSQL (persistent)
 */
import { logger } from '../../core/logger.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { prisma } from '../../database/prisma.js';
import { getRedis } from '../../database/redis.js';
import { OAuthRepository } from './oauth.repository.js';
import { GoogleOAuthProvider } from './providers/google.provider.js';
import { FacebookOAuthProvider } from './providers/facebook.provider.js';
import { GitHubOAuthProvider } from './providers/github.provider.js';
import type { OAuthConfig, OAuthProvider, OAuthUser, OAuthState, LinkedAccount } from './types.js';

// State expiration time (10 minutes)
const STATE_EXPIRATION_SECONDS = 10 * 60;
const OAUTH_STATE_PREFIX = 'oauth:state:';

export class OAuthService {
  private config: OAuthConfig;
  private repository: OAuthRepository;
  private googleProvider?: GoogleOAuthProvider;
  private facebookProvider?: FacebookOAuthProvider;
  private githubProvider?: GitHubOAuthProvider;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.repository = new OAuthRepository(prisma);

    if (config.google) {
      this.googleProvider = new GoogleOAuthProvider(config.google, config.callbackBaseUrl);
    }
    if (config.facebook) {
      this.facebookProvider = new FacebookOAuthProvider(config.facebook, config.callbackBaseUrl);
    }
    if (config.github) {
      this.githubProvider = new GitHubOAuthProvider(config.github, config.callbackBaseUrl);
    }
  }

  /**
   * Get authorization URL for a provider
   */
  async getAuthorizationUrl(provider: OAuthProvider): Promise<{ url: string; state: string }> {
    const providerInstance = this.getProvider(provider);
    const { url, state } = providerInstance.generateAuthUrl();

    // Store state in Redis with TTL
    const redis = getRedis();
    await redis.setex(
      `${OAUTH_STATE_PREFIX}${state.state}`,
      STATE_EXPIRATION_SECONDS,
      JSON.stringify(state)
    );

    logger.debug({ provider, state: state.state }, 'OAuth authorization URL generated');

    return { url, state: state.state };
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(provider: OAuthProvider, code: string, state: string): Promise<OAuthUser> {
    // Validate state from Redis
    const redis = getRedis();
    const storedStateJson = await redis.get(`${OAUTH_STATE_PREFIX}${state}`);

    if (!storedStateJson) {
      throw new BadRequestError('Invalid or expired OAuth state');
    }

    const storedState = JSON.parse(storedStateJson) as OAuthState;

    // Remove used state immediately
    await redis.del(`${OAUTH_STATE_PREFIX}${state}`);

    const providerInstance = this.getProvider(provider);

    // Exchange code for tokens
    const tokens = await providerInstance.exchangeCode(code, storedState.codeVerifier);

    // Get user info
    const user = await providerInstance.getUser(tokens.accessToken);

    // Update tokens in user object
    user.accessToken = tokens.accessToken;
    user.refreshToken = tokens.refreshToken;
    user.expiresAt = tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : undefined;

    logger.info({ provider, userId: user.providerAccountId }, 'OAuth user authenticated');

    return user;
  }

  /**
   * Link an OAuth account to a user
   */
  async linkAccount(userId: string, oauthUser: OAuthUser): Promise<LinkedAccount> {
    // Check if already linked
    const existingLink = await this.repository.findByProviderAccount(
      oauthUser.provider,
      oauthUser.providerAccountId
    );

    if (existingLink) {
      if (existingLink.userId !== userId) {
        throw new BadRequestError('This account is already linked to another user');
      }
      // Update existing link
      const updated = await this.repository.update(existingLink.id, {
        email: oauthUser.email || existingLink.email,
        name: oauthUser.name || existingLink.name,
        picture: oauthUser.picture || existingLink.picture,
        accessToken: oauthUser.accessToken,
        refreshToken: oauthUser.refreshToken || existingLink.refreshToken,
        expiresAt: oauthUser.expiresAt ? new Date(oauthUser.expiresAt) : existingLink.expiresAt,
      });

      if (!updated) {
        throw new NotFoundError('Linked account');
      }

      logger.info({ userId, provider: oauthUser.provider }, 'OAuth account updated');
      return updated;
    }

    // Create new linked account
    const linkedAccount = await this.repository.create({
      userId,
      provider: oauthUser.provider,
      providerAccountId: oauthUser.providerAccountId,
      email: oauthUser.email || undefined,
      name: oauthUser.name || undefined,
      picture: oauthUser.picture || undefined,
      accessToken: oauthUser.accessToken,
      refreshToken: oauthUser.refreshToken,
      expiresAt: oauthUser.expiresAt ? new Date(oauthUser.expiresAt) : undefined,
    });

    logger.info({ userId, provider: oauthUser.provider }, 'OAuth account linked');
    return linkedAccount;
  }

  /**
   * Unlink an OAuth account from a user
   */
  async unlinkAccount(userId: string, provider: OAuthProvider): Promise<void> {
    const deleted = await this.repository.deleteByUserAndProvider(userId, provider);

    if (!deleted) {
      throw new NotFoundError('Linked account');
    }

    logger.info({ userId, provider }, 'OAuth account unlinked');
  }

  /**
   * Get user's linked accounts
   */
  async getUserLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
    return this.repository.getByUserId(userId);
  }

  /**
   * Find linked account by provider and account ID
   */
  async findLinkedAccount(
    provider: OAuthProvider,
    providerAccountId: string
  ): Promise<LinkedAccount | null> {
    return this.repository.findByProviderAccount(provider, providerAccountId);
  }

  /**
   * Find user by linked account
   */
  async findUserByOAuth(
    provider: OAuthProvider,
    providerAccountId: string
  ): Promise<string | null> {
    const account = await this.repository.findByProviderAccount(provider, providerAccountId);
    return account?.userId || null;
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshTokens(linkedAccountId: string): Promise<LinkedAccount> {
    const account = await this.repository.getById(linkedAccountId);
    if (!account) {
      throw new NotFoundError('Linked account');
    }

    if (!account.refreshToken) {
      throw new BadRequestError('No refresh token available');
    }

    const provider = this.getProvider(account.provider);

    if ('refreshToken' in provider) {
      const tokens = await (provider as GoogleOAuthProvider).refreshToken(account.refreshToken);

      const updated = await this.repository.update(linkedAccountId, {
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined,
      });

      if (!updated) {
        throw new NotFoundError('Linked account');
      }

      return updated;
    }

    return account;
  }

  /**
   * Get linked account by ID
   */
  async getLinkedAccount(id: string): Promise<LinkedAccount | null> {
    return this.repository.getById(id);
  }

  /**
   * Delete all linked accounts for a user
   */
  async deleteUserAccounts(userId: string): Promise<number> {
    return this.repository.deleteByUserId(userId);
  }

  /**
   * Get supported providers
   */
  getSupportedProviders(): OAuthProvider[] {
    const providers: OAuthProvider[] = [];
    if (this.googleProvider) providers.push('google');
    if (this.facebookProvider) providers.push('facebook');
    if (this.githubProvider) providers.push('github');
    return providers;
  }

  /**
   * Check if provider is enabled
   */
  isProviderEnabled(provider: OAuthProvider): boolean {
    return this.getSupportedProviders().includes(provider);
  }

  // Private methods
  private getProvider(
    provider: OAuthProvider
  ): GoogleOAuthProvider | FacebookOAuthProvider | GitHubOAuthProvider {
    switch (provider) {
      case 'google':
        if (!this.googleProvider) {
          throw new BadRequestError('Google OAuth not configured');
        }
        return this.googleProvider;
      case 'facebook':
        if (!this.facebookProvider) {
          throw new BadRequestError('Facebook OAuth not configured');
        }
        return this.facebookProvider;
      case 'github':
        if (!this.githubProvider) {
          throw new BadRequestError('GitHub OAuth not configured');
        }
        return this.githubProvider;
      default:
        throw new BadRequestError(`Unsupported OAuth provider: ${provider}`);
    }
  }
}

let oauthService: OAuthService | null = null;

export function getOAuthService(): OAuthService {
  if (!oauthService) {
    throw new Error('OAuth service not initialized. Call createOAuthService first.');
  }
  return oauthService;
}

export function createOAuthService(config: OAuthConfig): OAuthService {
  oauthService = new OAuthService(config);
  return oauthService;
}
