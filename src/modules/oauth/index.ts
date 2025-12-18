export { OAuthService, getOAuthService, createOAuthService } from './oauth.service.js';
export { registerOAuthRoutes } from './oauth.routes.js';
export { GoogleOAuthProvider } from './providers/google.provider.js';
export { FacebookOAuthProvider } from './providers/facebook.provider.js';
export { GitHubOAuthProvider } from './providers/github.provider.js';
export { TwitterOAuthProvider } from './providers/twitter.provider.js';
export { AppleOAuthProvider } from './providers/apple.provider.js';
export type {
  OAuthConfig,
  OAuthProvider,
  OAuthUser,
  OAuthTokens,
  OAuthState,
  LinkedAccount,
  GoogleOAuthConfig,
  FacebookOAuthConfig,
  GitHubOAuthConfig,
  TwitterOAuthConfig,
  AppleOAuthConfig,
} from './types.js';
