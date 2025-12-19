import { randomBytes, createSign } from 'crypto';
import { logger } from '../../../core/logger.js';
import type { AppleOAuthConfig, OAuthUser, OAuthTokens, OAuthState } from '../types.js';

const APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

const DEFAULT_SCOPES = ['name', 'email'];

interface AppleIdToken {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string; // User ID
  email?: string;
  email_verified?: string;
  is_private_email?: string;
  auth_time: number;
  nonce_supported: boolean;
}

export class AppleOAuthProvider {
  private config: AppleOAuthConfig;
  private callbackUrl: string;

  constructor(config: AppleOAuthConfig, callbackBaseUrl: string) {
    this.config = config;
    this.callbackUrl = `${callbackBaseUrl}/auth/oauth/apple/callback`;
  }

  /**
   * Generate authorization URL
   */
  generateAuthUrl(state?: string): { url: string; state: OAuthState } {
    const stateValue = state || randomBytes(32).toString('hex');
    const nonce = randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code id_token',
      response_mode: 'form_post',
      scope: DEFAULT_SCOPES.join(' '),
      state: stateValue,
      nonce,
    });

    const oauthState: OAuthState = {
      state: stateValue,
      redirectUri: this.callbackUrl,
      createdAt: Date.now(),
    };

    return {
      url: `${APPLE_AUTH_URL}?${params.toString()}`,
      state: oauthState,
    };
  }

  /**
   * Generate client secret (JWT signed with private key)
   */
  private generateClientSecret(): string {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour

    const header = {
      alg: 'ES256',
      kid: this.config.keyId,
    };

    const payload = {
      iss: this.config.teamId,
      iat: now,
      exp,
      aud: 'https://appleid.apple.com',
      sub: this.config.clientId,
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signatureInput = `${headerB64}.${payloadB64}`;

    const sign = createSign('SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(this.config.privateKey, 'base64url');

    return `${signatureInput}.${signature}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<OAuthTokens> {
    const clientSecret = this.generateClientSecret();

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.callbackUrl,
    });

    const response = await fetch(APPLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error }, 'Apple token exchange failed');
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      id_token: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      idToken: data.id_token,
    };
  }

  /**
   * Get user information from Apple ID token
   * Note: Apple only provides user info on first authorization
   */
  async getUser(
    accessToken: string,
    idToken?: string,
    userInfo?: { name?: { firstName?: string; lastName?: string }; email?: string }
  ): Promise<OAuthUser> {
    if (!idToken) {
      throw new Error('ID token is required for Apple Sign In');
    }

    // Decode ID token (in production, verify signature with Apple's public keys)
    const [, payloadB64] = idToken.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64 ?? '', 'base64').toString()) as AppleIdToken;

    // Apple only sends user info on first authorization
    // After that, you must store it yourself
    const firstName = userInfo?.name?.firstName || null;
    const lastName = userInfo?.name?.lastName || null;
    const email = userInfo?.email || payload.email || null;

    return {
      id: payload.sub,
      email,
      emailVerified: payload.email_verified === 'true',
      name: firstName && lastName ? `${firstName} ${lastName}` : null,
      firstName,
      lastName,
      picture: null, // Apple doesn't provide profile pictures
      provider: 'apple',
      providerAccountId: payload.sub,
      accessToken,
      raw: { ...payload, userInfo },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const clientSecret = this.generateClientSecret();

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(APPLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      token_type: string;
      id_token: string;
    };

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      idToken: data.id_token,
    };
  }

  /**
   * Revoke refresh token
   */
  async revokeToken(refreshToken: string): Promise<void> {
    const clientSecret = this.generateClientSecret();

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: clientSecret,
      token: refreshToken,
      token_type_hint: 'refresh_token',
    });

    await fetch('https://appleid.apple.com/auth/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  }

  /**
   * Get Apple's public keys for ID token verification
   */
  async getPublicKeys(): Promise<
    Array<{ kty: string; kid: string; use: string; alg: string; n: string; e: string }>
  > {
    const response = await fetch(APPLE_KEYS_URL);
    const data = (await response.json()) as {
      keys: Array<{ kty: string; kid: string; use: string; alg: string; n: string; e: string }>;
    };
    return data.keys;
  }
}
