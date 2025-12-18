import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthService } from '../auth/auth.service.js';
import { createAuthMiddleware } from '../auth/auth.middleware.js';
import { commonResponses } from '../swagger/index.js';
import { getOAuthService } from './oauth.service.js';
import type { OAuthProvider, OAuthCallbackParams } from './types.js';

const oauthTag = 'OAuth';

export function registerOAuthRoutes(app: FastifyInstance, authService: AuthService): void {
  const authenticate = createAuthMiddleware(authService);
  const oauthService = getOAuthService();

  // Get supported providers
  app.get(
    '/auth/oauth/providers',
    {
      schema: {
        tags: [oauthTag],
        summary: 'Get supported OAuth providers',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  providers: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['google', 'facebook', 'github', 'twitter', 'apple'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const providers = oauthService.getSupportedProviders();
      return reply.send({ success: true, data: { providers } });
    }
  );

  // Initiate OAuth flow
  app.get(
    '/auth/oauth/:provider',
    {
      schema: {
        tags: [oauthTag],
        summary: 'Initiate OAuth authentication',
        description: 'Redirects to the OAuth provider for authentication',
        params: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: ['google', 'facebook', 'github', 'twitter', 'apple'],
            },
          },
          required: ['provider'],
        },
        querystring: {
          type: 'object',
          properties: {
            redirect: { type: 'string', description: 'URL to redirect after auth' },
          },
        },
        response: {
          302: { description: 'Redirect to OAuth provider' },
          400: commonResponses.error,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { provider: string };
        Querystring: { redirect?: string };
      }>,
      reply: FastifyReply
    ) => {
      const provider = request.params.provider as OAuthProvider;

      if (!oauthService.isProviderEnabled(provider)) {
        return reply.status(400).send({
          success: false,
          message: `OAuth provider '${provider}' is not configured`,
        });
      }

      const { url, state } = oauthService.getAuthorizationUrl(provider);

      // Store redirect URL in cookie if provided
      if (request.query.redirect) {
        reply.setCookie('oauth_redirect', request.query.redirect, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 600, // 10 minutes
          path: '/',
        });
      }

      // Store state in cookie for CSRF protection
      reply.setCookie('oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600,
        path: '/',
      });

      return reply.redirect(url);
    }
  );

  // OAuth callback
  app.get(
    '/auth/oauth/:provider/callback',
    {
      schema: {
        tags: [oauthTag],
        summary: 'OAuth callback endpoint',
        description: 'Handles the OAuth provider callback after authentication',
        params: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: ['google', 'facebook', 'github', 'twitter', 'apple'],
            },
          },
          required: ['provider'],
        },
        querystring: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            state: { type: 'string' },
            error: { type: 'string' },
            error_description: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: { type: 'object' },
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  isNewUser: { type: 'boolean' },
                },
              },
            },
          },
          400: commonResponses.error,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { provider: string };
        Querystring: OAuthCallbackParams;
      }>,
      reply: FastifyReply
    ) => {
      const provider = request.params.provider as OAuthProvider;
      const { code, state, error, errorDescription } = request.query;

      // Check for OAuth error
      if (error) {
        return reply.status(400).send({
          success: false,
          message: errorDescription || error,
        });
      }

      if (!code || !state) {
        return reply.status(400).send({
          success: false,
          message: 'Missing code or state parameter',
        });
      }

      // Verify state from cookie
      const storedState = request.cookies.oauth_state;
      if (storedState !== state) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid state parameter',
        });
      }

      // Clear state cookie
      reply.clearCookie('oauth_state', { path: '/' });

      try {
        // Handle OAuth callback
        const oauthUser = await oauthService.handleCallback(provider, code, state);

        // Check if user exists by linked account
        let userId = await oauthService.findUserByOAuth(provider, oauthUser.providerAccountId);
        let isNewUser = false;

        if (!userId) {
          // Check if user exists by email
          if (oauthUser.email) {
            const existingUser = await authService.findUserByEmail(oauthUser.email);
            if (existingUser) {
              userId = existingUser.id;
              // Link the account
              await oauthService.linkAccount(userId, oauthUser);
            }
          }

          // Create new user if not found
          if (!userId) {
            const newUser = await authService.createUserFromOAuth({
              email: oauthUser.email || `${oauthUser.providerAccountId}@${provider}.oauth`,
              name: oauthUser.name,
              picture: oauthUser.picture,
              emailVerified: oauthUser.emailVerified,
            });
            userId = newUser.id;
            isNewUser = true;
            await oauthService.linkAccount(userId, oauthUser);
          }
        }

        // Generate JWT tokens
        const tokens = await authService.generateTokensForUser(userId);

        // Get redirect URL from cookie
        const redirectUrl = request.cookies.oauth_redirect;
        reply.clearCookie('oauth_redirect', { path: '/' });

        // If redirect URL is provided, redirect with tokens
        if (redirectUrl) {
          const url = new URL(redirectUrl);
          url.searchParams.set('access_token', tokens.accessToken);
          url.searchParams.set('refresh_token', tokens.refreshToken);
          url.searchParams.set('is_new_user', String(isNewUser));
          return reply.redirect(url.toString());
        }

        // Otherwise return JSON response
        return reply.send({
          success: true,
          data: {
            user: {
              id: userId,
              email: oauthUser.email,
              name: oauthUser.name,
              picture: oauthUser.picture,
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isNewUser,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'OAuth authentication failed';
        return reply.status(400).send({ success: false, message });
      }
    }
  );

  // Link OAuth account (authenticated users)
  app.post(
    '/auth/oauth/:provider/link',
    {
      preHandler: [authenticate],
      schema: {
        tags: [oauthTag],
        summary: 'Link OAuth account to current user',
        description: 'Initiates the process to link an OAuth account to the authenticated user',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: ['google', 'facebook', 'github', 'twitter', 'apple'],
            },
          },
          required: ['provider'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  authUrl: { type: 'string' },
                },
              },
            },
          },
          400: commonResponses.error,
          401: commonResponses.unauthorized,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { provider: string } }>, reply: FastifyReply) => {
      const provider = request.params.provider as OAuthProvider;
      const user = (request as FastifyRequest & { user: { id: string } }).user;

      if (!oauthService.isProviderEnabled(provider)) {
        return reply.status(400).send({
          success: false,
          message: `OAuth provider '${provider}' is not configured`,
        });
      }

      const { url, state } = oauthService.getAuthorizationUrl(provider);

      // Store user ID in cookie for linking after callback
      reply.setCookie('oauth_link_user', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600,
        path: '/',
      });

      reply.setCookie('oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600,
        path: '/',
      });

      return reply.send({ success: true, data: { authUrl: url } });
    }
  );

  // Unlink OAuth account
  app.delete(
    '/auth/oauth/:provider/unlink',
    {
      preHandler: [authenticate],
      schema: {
        tags: [oauthTag],
        summary: 'Unlink OAuth account from current user',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: ['google', 'facebook', 'github', 'twitter', 'apple'],
            },
          },
          required: ['provider'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          400: commonResponses.error,
          401: commonResponses.unauthorized,
          404: commonResponses.notFound,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { provider: string } }>, reply: FastifyReply) => {
      const provider = request.params.provider as OAuthProvider;
      const user = (request as FastifyRequest & { user: { id: string } }).user;

      await oauthService.unlinkAccount(user.id, provider);

      return reply.send({
        success: true,
        message: `${provider} account unlinked successfully`,
      });
    }
  );

  // Get linked accounts
  app.get(
    '/auth/oauth/linked',
    {
      preHandler: [authenticate],
      schema: {
        tags: [oauthTag],
        summary: 'Get linked OAuth accounts',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accounts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        provider: { type: 'string' },
                        email: { type: 'string' },
                        name: { type: 'string' },
                        picture: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: commonResponses.unauthorized,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as FastifyRequest & { user: { id: string } }).user;
      const accounts = await oauthService.getUserLinkedAccounts(user.id);

      // Remove sensitive data
      const safeAccounts = accounts.map((account) => ({
        provider: account.provider,
        email: account.email,
        name: account.name,
        picture: account.picture,
        createdAt: account.createdAt,
      }));

      return reply.send({ success: true, data: { accounts: safeAccounts } });
    }
  );
}
