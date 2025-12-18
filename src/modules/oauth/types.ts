export type OAuthProvider = 'google' | 'facebook' | 'github' | 'twitter' | 'apple';

export interface OAuthConfig {
  google?: GoogleOAuthConfig;
  facebook?: FacebookOAuthConfig;
  github?: GitHubOAuthConfig;
  twitter?: TwitterOAuthConfig;
  apple?: AppleOAuthConfig;
  callbackBaseUrl: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  scopes?: string[];
}

export interface FacebookOAuthConfig {
  clientId: string;
  clientSecret: string;
  scopes?: string[];
}

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  scopes?: string[];
}

export interface TwitterOAuthConfig {
  clientId: string;
  clientSecret: string;
}

export interface AppleOAuthConfig {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}

export interface OAuthUser {
  id: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  picture: string | null;
  provider: OAuthProvider;
  providerAccountId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  raw: Record<string, unknown>;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
  scope?: string;
  idToken?: string;
}

export interface OAuthState {
  state: string;
  codeVerifier?: string; // For PKCE
  redirectUri: string;
  createdAt: number;
}

export interface LinkedAccount {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  email?: string;
  name?: string;
  picture?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthCallbackParams {
  code: string;
  state: string;
  error?: string;
  errorDescription?: string;
}
