import { randomBytes, createHash } from 'crypto';
import { logger } from '../../../core/logger.js';
import type { GoogleOAuthConfig, OAuthUser, OAuthTokens, OAuthState } from '../types.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const DEFAULT_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export class GoogleOAuthProvider {
  private config: GoogleOAuthConfig;
  private callbackUrl: string;

  constructor(config: GoogleOAuthConfig, callbackBaseUrl: string) {
    this.config = config;
    this.callbackUrl = `${callbackBaseUrl}/auth/oauth/google/callback`;
  }

  /**
   * Generate authorization URL with PKCE
   */
  generateAuthUrl(state?: string): { url: string; state: OAuthState } {
    const stateValue = state || randomBytes(32).toString('hex');
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

    const scopes = this.config.scopes || DEFAULT_SCOPES;

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: scopes.join(' '),
      state: stateValue,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
    });

    const oauthState: OAuthState = {
      state: stateValue,
      codeVerifier,
      redirectUri: this.callbackUrl,
      createdAt: Date.now(),
    };

    return {
      url: `${GOOGLE_AUTH_URL}?${params.toString()}`,
      state: oauthState,
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.callbackUrl,
    });

    if (codeVerifier) {
      params.append('code_verifier', codeVerifier);
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error }, 'Google token exchange failed');
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      scope: string;
      id_token?: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
      idToken: data.id_token,
    };
  }

  /**
   * Get user information from Google
   */
  async getUser(accessToken: string): Promise<OAuthUser> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error }, 'Failed to get Google user info');
      throw new Error(`Failed to get user info: ${error}`);
    }

    const data = (await response.json()) as {
      id: string;
      email: string;
      verified_email: boolean;
      name: string;
      given_name: string;
      family_name: string;
      picture: string;
    };

    return {
      id: data.id,
      email: data.email,
      emailVerified: data.verified_email,
      name: data.name,
      firstName: data.given_name,
      lastName: data.family_name,
      picture: data.picture,
      provider: 'google',
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
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      token_type: string;
      scope: string;
    };

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Revoke access token
   */
  async revokeToken(token: string): Promise<void> {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
      method: 'POST',
    });
  }
}
