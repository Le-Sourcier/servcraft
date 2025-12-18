import { randomBytes } from 'crypto';
import { logger } from '../../../core/logger.js';
import type { FacebookOAuthConfig, OAuthUser, OAuthTokens, OAuthState } from '../types.js';

const FACEBOOK_AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth';
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
const FACEBOOK_USERINFO_URL = 'https://graph.facebook.com/v18.0/me';

const DEFAULT_SCOPES = ['email', 'public_profile'];

export class FacebookOAuthProvider {
  private config: FacebookOAuthConfig;
  private callbackUrl: string;

  constructor(config: FacebookOAuthConfig, callbackBaseUrl: string) {
    this.config = config;
    this.callbackUrl = `${callbackBaseUrl}/auth/oauth/facebook/callback`;
  }

  /**
   * Generate authorization URL
   */
  generateAuthUrl(state?: string): { url: string; state: OAuthState } {
    const stateValue = state || randomBytes(32).toString('hex');
    const scopes = this.config.scopes || DEFAULT_SCOPES;

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: scopes.join(','),
      state: stateValue,
      auth_type: 'rerequest', // Re-request declined permissions
    });

    const oauthState: OAuthState = {
      state: stateValue,
      redirectUri: this.callbackUrl,
      createdAt: Date.now(),
    };

    return {
      url: `${FACEBOOK_AUTH_URL}?${params.toString()}`,
      state: oauthState,
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.callbackUrl,
    });

    const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`);

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error }, 'Facebook token exchange failed');
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get user information from Facebook
   */
  async getUser(accessToken: string): Promise<OAuthUser> {
    const fields = 'id,email,name,first_name,last_name,picture.type(large)';
    const url = `${FACEBOOK_USERINFO_URL}?fields=${fields}&access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error }, 'Failed to get Facebook user info');
      throw new Error(`Failed to get user info: ${error}`);
    }

    const data = (await response.json()) as {
      id: string;
      email?: string;
      name: string;
      first_name: string;
      last_name: string;
      picture?: { data: { url: string } };
    };

    return {
      id: data.id,
      email: data.email || null,
      emailVerified: !!data.email, // Facebook only returns verified emails
      name: data.name,
      firstName: data.first_name,
      lastName: data.last_name,
      picture: data.picture?.data?.url || null,
      provider: 'facebook',
      providerAccountId: data.id,
      accessToken,
      raw: data,
    };
  }

  /**
   * Get long-lived access token (60 days instead of ~2 hours)
   */
  async getLongLivedToken(shortLivedToken: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to get long-lived token');
    }

    const data = (await response.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Debug/inspect access token
   */
  async inspectToken(
    accessToken: string
  ): Promise<{ isValid: boolean; userId: string; expiresAt: number }> {
    const appToken = `${this.config.clientId}|${this.config.clientSecret}`;
    const url = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appToken}`;

    const response = await fetch(url);
    const data = (await response.json()) as {
      data: {
        is_valid: boolean;
        user_id: string;
        expires_at: number;
      };
    };

    return {
      isValid: data.data.is_valid,
      userId: data.data.user_id,
      expiresAt: data.data.expires_at,
    };
  }

  /**
   * Revoke access (user must re-authorize)
   */
  async revokeAccess(userId: string, accessToken: string): Promise<void> {
    const url = `https://graph.facebook.com/v18.0/${userId}/permissions?access_token=${accessToken}`;
    await fetch(url, { method: 'DELETE' });
  }
}
