import { randomUUID } from 'crypto';
import { logger } from '../../core/logger.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { GoogleOAuthProvider } from './providers/google.provider.js';
import { FacebookOAuthProvider } from './providers/facebook.provider.js';
import { GitHubOAuthProvider } from './providers/github.provider.js';
import type { OAuthConfig, OAuthProvider, OAuthUser, OAuthState, LinkedAccount } from './types.js';

// In-memory state storage (use Redis in production)
const oauthStates = new Map<string, OAuthState>();
const linkedAccounts = new Map<string, LinkedAccount>();

// State expiration time (10 minutes)
const STATE_EXPIRATION = 10 * 60 * 1000;

export class OAuthService {
  private config: OAuthConfig;
  private googleProvider?: GoogleOAuthProvider;
  private facebookProvider?: FacebookOAuthProvider;
  private githubProvider?: GitHubOAuthProvider;

  constructor(config: OAuthConfig) {
    this.config = config;

    if (config.google) {
      this.googleProvider = new GoogleOAuthProvider(config.google, config.callbackBaseUrl);
    }
    if (config.facebook) {
      this.facebookProvider = new FacebookOAuthProvider(config.facebook, config.callbackBaseUrl);
    }
    if (config.github) {
      this.githubProvider = new GitHubOAuthProvider(config.github, config.callbackBaseUrl);
    }

    // Cleanup expired states periodically
    setInterval(() => this.cleanupExpiredStates(), 60000);
  }

  /**
   * Get authorization URL for a provider
   */
  getAuthorizationUrl(provider: OAuthProvider): { url: string; state: string } {
    const providerInstance = this.getProvider(provider);
    const { url, state } = providerInstance.generateAuthUrl();

    // Store state for validation
    oauthStates.set(state.state, state);

    logger.debug({ provider, state: state.state }, 'OAuth authorization URL generated');

    return { url, state: state.state };
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(provider: OAuthProvider, code: string, state: string): Promise<OAuthUser> {
    // Validate state
    const storedState = oauthStates.get(state);
    if (!storedState) {
      throw new BadRequestError('Invalid or expired OAuth state');
    }

    // Check expiration
    if (Date.now() - storedState.createdAt > STATE_EXPIRATION) {
      oauthStates.delete(state);
      throw new BadRequestError('OAuth state expired');
    }

    // Remove used state
    oauthStates.delete(state);

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
    const existingLink = await this.findLinkedAccount(
      oauthUser.provider,
      oauthUser.providerAccountId
    );
    if (existingLink) {
      if (existingLink.userId !== userId) {
        throw new BadRequestError('This account is already linked to another user');
      }
      // Update existing link
      return this.updateLinkedAccount(existingLink.id, oauthUser);
    }

    const linkedAccount: LinkedAccount = {
      id: randomUUID(),
      userId,
      provider: oauthUser.provider,
      providerAccountId: oauthUser.providerAccountId,
      email: oauthUser.email || undefined,
      name: oauthUser.name || undefined,
      picture: oauthUser.picture || undefined,
      accessToken: oauthUser.accessToken,
      refreshToken: oauthUser.refreshToken,
      expiresAt: oauthUser.expiresAt ? new Date(oauthUser.expiresAt) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    linkedAccounts.set(linkedAccount.id, linkedAccount);
    logger.info({ userId, provider: oauthUser.provider }, 'OAuth account linked');

    return linkedAccount;
  }

  /**
   * Unlink an OAuth account from a user
   */
  async unlinkAccount(userId: string, provider: OAuthProvider): Promise<void> {
    for (const [id, account] of linkedAccounts.entries()) {
      if (account.userId === userId && account.provider === provider) {
        linkedAccounts.delete(id);
        logger.info({ userId, provider }, 'OAuth account unlinked');
        return;
      }
    }
    throw new NotFoundError('Linked account');
  }

  /**
   * Get user's linked accounts
   */
  async getUserLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
    const accounts: LinkedAccount[] = [];
    for (const account of linkedAccounts.values()) {
      if (account.userId === userId) {
        accounts.push(account);
      }
    }
    return accounts;
  }

  /**
   * Find linked account by provider and account ID
   */
  async findLinkedAccount(
    provider: OAuthProvider,
    providerAccountId: string
  ): Promise<LinkedAccount | null> {
    for (const account of linkedAccounts.values()) {
      if (account.provider === provider && account.providerAccountId === providerAccountId) {
        return account;
      }
    }
    return null;
  }

  /**
   * Find user by linked account
   */
  async findUserByOAuth(
    provider: OAuthProvider,
    providerAccountId: string
  ): Promise<string | null> {
    const account = await this.findLinkedAccount(provider, providerAccountId);
    return account?.userId || null;
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshTokens(linkedAccountId: string): Promise<LinkedAccount> {
    const account = linkedAccounts.get(linkedAccountId);
    if (!account) {
      throw new NotFoundError('Linked account');
    }

    if (!account.refreshToken) {
      throw new BadRequestError('No refresh token available');
    }

    const provider = this.getProvider(account.provider);

    if ('refreshToken' in provider) {
      const tokens = await (provider as GoogleOAuthProvider).refreshToken(account.refreshToken);
      account.accessToken = tokens.accessToken;
      account.expiresAt = tokens.expiresIn
        ? new Date(Date.now() + tokens.expiresIn * 1000)
        : undefined;
      account.updatedAt = new Date();
      linkedAccounts.set(linkedAccountId, account);
    }

    return account;
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

  private async updateLinkedAccount(id: string, oauthUser: OAuthUser): Promise<LinkedAccount> {
    const account = linkedAccounts.get(id);
    if (!account) {
      throw new NotFoundError('Linked account');
    }

    account.email = oauthUser.email || account.email;
    account.name = oauthUser.name || account.name;
    account.picture = oauthUser.picture || account.picture;
    account.accessToken = oauthUser.accessToken;
    account.refreshToken = oauthUser.refreshToken || account.refreshToken;
    account.expiresAt = oauthUser.expiresAt ? new Date(oauthUser.expiresAt) : account.expiresAt;
    account.updatedAt = new Date();

    linkedAccounts.set(id, account);
    return account;
  }

  private cleanupExpiredStates(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [state, data] of oauthStates.entries()) {
      if (now - data.createdAt > STATE_EXPIRATION) {
        oauthStates.delete(state);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug({ cleaned }, 'Expired OAuth states cleaned');
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
