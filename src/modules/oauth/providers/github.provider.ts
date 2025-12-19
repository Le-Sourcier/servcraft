import { randomBytes } from 'crypto';
import { logger } from '../../../core/logger.js';
import type { GitHubOAuthConfig, OAuthUser, OAuthTokens, OAuthState } from '../types.js';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';

const DEFAULT_SCOPES = ['read:user', 'user:email'];

export class GitHubOAuthProvider {
  private config: GitHubOAuthConfig;
  private callbackUrl: string;

  constructor(config: GitHubOAuthConfig, callbackBaseUrl: string) {
    this.config = config;
    this.callbackUrl = `${callbackBaseUrl}/auth/oauth/github/callback`;
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
      scope: scopes.join(' '),
      state: stateValue,
      allow_signup: 'true',
    });

    const oauthState: OAuthState = {
      state: stateValue,
      redirectUri: this.callbackUrl,
      createdAt: Date.now(),
    };

    return {
      url: `${GITHUB_AUTH_URL}?${params.toString()}`,
      state: oauthState,
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<OAuthTokens> {
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.callbackUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error }, 'GitHub token exchange failed');
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      token_type: string;
      scope: string;
      error?: string;
      error_description?: string;
    };

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Get user information from GitHub
   */
  async getUser(accessToken: string): Promise<OAuthUser> {
    // Get user profile
    const userResponse = await fetch(`${GITHUB_API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      const error = await userResponse.text();
      logger.error({ error }, 'Failed to get GitHub user info');
      throw new Error(`Failed to get user info: ${error}`);
    }

    const userData = (await userResponse.json()) as {
      id: number;
      login: string;
      name: string | null;
      email: string | null;
      avatar_url: string;
      bio: string | null;
      company: string | null;
      location: string | null;
      html_url: string;
    };

    // Get user emails (email might be private)
    let primaryEmail: string | null = userData.email;
    let emailVerified = false;

    if (!primaryEmail) {
      const emailsResponse = await fetch(`${GITHUB_API_URL}/user/emails`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (emailsResponse.ok) {
        const emails = (await emailsResponse.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;

        const primary = emails.find((e) => e.primary && e.verified);
        if (primary) {
          primaryEmail = primary.email;
          emailVerified = primary.verified;
        } else {
          const verified = emails.find((e) => e.verified);
          if (verified) {
            primaryEmail = verified.email;
            emailVerified = true;
          }
        }
      }
    } else {
      emailVerified = true; // Public emails are verified
    }

    // Parse name into first/last
    let firstName: string | null = null;
    let lastName: string | null = null;
    if (userData.name) {
      const parts = userData.name.split(' ');
      firstName = parts[0] ?? null;
      lastName = parts.slice(1).join(' ') || null;
    }

    return {
      id: userData.id.toString(),
      email: primaryEmail,
      emailVerified,
      name: userData.name || userData.login,
      firstName,
      lastName,
      picture: userData.avatar_url,
      provider: 'github',
      providerAccountId: userData.id.toString(),
      accessToken,
      raw: userData,
    };
  }

  /**
   * Get user's repositories
   */
  async getRepositories(
    accessToken: string,
    options: { page?: number; perPage?: number; sort?: 'created' | 'updated' | 'pushed' } = {}
  ): Promise<Array<{ id: number; name: string; fullName: string; private: boolean; url: string }>> {
    const params = new URLSearchParams({
      page: (options.page || 1).toString(),
      per_page: (options.perPage || 30).toString(),
      sort: options.sort || 'updated',
    });

    const response = await fetch(`${GITHUB_API_URL}/user/repos?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get repositories');
    }

    const repos = (await response.json()) as Array<{
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      html_url: string;
    }>;

    return repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      url: repo.html_url,
    }));
  }

  /**
   * Check if user has access to a specific repository
   */
  async checkRepoAccess(accessToken: string, owner: string, repo: string): Promise<boolean> {
    const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    return response.ok;
  }

  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    await fetch(`https://api.github.com/applications/${this.config.clientId}/token`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: accessToken }),
    });
  }
}
