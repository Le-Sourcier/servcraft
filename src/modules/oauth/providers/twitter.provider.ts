import { randomBytes, createHmac } from 'crypto';
import { logger } from '../../../core/logger.js';
import type { TwitterOAuthConfig, OAuthUser, OAuthTokens, OAuthState } from '../types.js';

// Twitter OAuth 2.0 with PKCE
const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const TWITTER_USERINFO_URL = 'https://api.twitter.com/2/users/me';

const DEFAULT_SCOPES = ['tweet.read', 'users.read', 'offline.access'];

export class TwitterOAuthProvider {
  private config: TwitterOAuthConfig;
  private callbackUrl: string;

  constructor(config: TwitterOAuthConfig, callbackBaseUrl: string) {
    this.config = config;
    this.callbackUrl = `${callbackBaseUrl}/auth/oauth/twitter/callback`;
  }

  /**
   * Generate authorization URL with PKCE
   */
  generateAuthUrl(state?: string): { url: string; state: OAuthState } {
    const stateValue = state || randomBytes(32).toString('hex');
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHmac('sha256', codeVerifier)
      .update(codeVerifier)
      .digest('base64url');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.callbackUrl,
      scope: DEFAULT_SCOPES.join(' '),
      state: stateValue,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const oauthState: OAuthState = {
      state: stateValue,
      codeVerifier,
      redirectUri: this.callbackUrl,
      createdAt: Date.now(),
    };

    return {
      url: `${TWITTER_AUTH_URL}?${params.toString()}`,
      state: oauthState,
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.callbackUrl,
      code_verifier: codeVerifier || '',
    });

    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64'
    );

    const response = await fetch(TWITTER_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error }, 'Twitter token exchange failed');
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      scope: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Get user information from Twitter
   */
  async getUser(accessToken: string): Promise<OAuthUser> {
    const params = new URLSearchParams({
      'user.fields': 'id,name,username,profile_image_url,description,verified',
    });

    const response = await fetch(`${TWITTER_USERINFO_URL}?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error }, 'Failed to get Twitter user info');
      throw new Error(`Failed to get user info: ${error}`);
    }

    const result = (await response.json()) as {
      data: {
        id: string;
        name: string;
        username: string;
        profile_image_url?: string;
        description?: string;
        verified?: boolean;
      };
    };

    const data = result.data;

    return {
      id: data.id,
      email: null, // Twitter doesn't provide email by default
      emailVerified: false,
      name: data.name,
      firstName: data.name.split(' ')[0] ?? null,
      lastName: data.name.split(' ').slice(1).join(' ') || null,
      picture: data.profile_image_url?.replace('_normal', '') || null,
      provider: 'twitter',
      providerAccountId: data.id,
      accessToken,
      raw: data,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64'
    );

    const response = await fetch(TWITTER_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      scope: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Revoke access token
   */
  async revokeToken(token: string): Promise<void> {
    const params = new URLSearchParams({
      token,
      token_type_hint: 'access_token',
    });

    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64'
    );

    await fetch('https://api.twitter.com/2/oauth2/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });
  }
}
