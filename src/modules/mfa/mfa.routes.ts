import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthService } from '../auth/auth.service.js';
import { createAuthMiddleware } from '../auth/auth.middleware.js';
import { commonResponses } from '../swagger/index.js';
import { getMFAService } from './mfa.service.js';
import type { MFAMethod } from './types.js';

const mfaTag = 'MFA';

export function registerMFARoutes(app: FastifyInstance, authService: AuthService): void {
  const authenticate = createAuthMiddleware(authService);
  const mfaService = getMFAService();

  // Get MFA status
  app.get(
    '/auth/mfa/status',
    {
      preHandler: [authenticate],
      schema: {
        tags: [mfaTag],
        summary: 'Get MFA status for current user',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  enabled: { type: 'boolean' },
                  methods: {
                    type: 'array',
                    items: { type: 'string', enum: ['totp', 'sms', 'email', 'backup_codes'] },
                  },
                  totpEnabled: { type: 'boolean' },
                  smsEnabled: { type: 'boolean' },
                  emailEnabled: { type: 'boolean' },
                  backupCodesRemaining: { type: 'number' },
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
      const userMFA = await mfaService.getUserMFA(user.id);

      return reply.send({
        success: true,
        data: {
          enabled: userMFA?.enabled || false,
          methods: userMFA?.methods || [],
          totpEnabled: userMFA?.totpVerified || false,
          smsEnabled: userMFA?.phoneVerified || false,
          emailEnabled: userMFA?.emailVerified || false,
          backupCodesRemaining: mfaService.getRemainingBackupCodes(user.id),
        },
      });
    }
  );

  // Setup TOTP (Google Authenticator, etc.)
  app.post(
    '/auth/mfa/totp/setup',
    {
      preHandler: [authenticate],
      schema: {
        tags: [mfaTag],
        summary: 'Setup TOTP (Google Authenticator)',
        description: 'Generates a secret and QR code for TOTP setup',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  qrCode: { type: 'string', description: 'URL to QR code image' },
                  manualEntry: { type: 'string', description: 'Manual entry key' },
                  secret: { type: 'string', description: 'Base32 secret (keep secure)' },
                },
              },
            },
          },
          401: commonResponses.unauthorized,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as FastifyRequest & { user: { id: string; email: string } }).user;
      const setup = await mfaService.setupTOTP(user.id, user.email);

      return reply.send({
        success: true,
        data: {
          qrCode: setup.qrCode,
          manualEntry: setup.manualEntry,
          secret: setup.secret,
        },
      });
    }
  );

  // Verify TOTP setup
  app.post(
    '/auth/mfa/totp/verify',
    {
      preHandler: [authenticate],
      schema: {
        tags: [mfaTag],
        summary: 'Verify TOTP setup',
        description: 'Verify the first TOTP code to complete setup',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 6, description: '6-digit TOTP code' },
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
                  verified: { type: 'boolean' },
                  backupCodes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'One-time backup codes (save these!)',
                  },
                },
              },
            },
          },
          400: commonResponses.error,
          401: commonResponses.unauthorized,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as FastifyRequest & { user: { id: string } }).user;
      const { code } = request.body as { code: string };
      const verified = await mfaService.verifyTOTPSetup(user.id, code);

      if (!verified) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid TOTP code',
        });
      }

      // Generate backup codes after successful TOTP setup
      const backupCodes = await mfaService.generateBackupCodes(user.id);

      return reply.send({
        success: true,
        data: {
          verified: true,
          backupCodes: backupCodes.codes,
        },
      });
    }
  );

  // Disable TOTP
  app.delete(
    '/auth/mfa/totp',
    {
      preHandler: [authenticate],
      schema: {
        tags: [mfaTag],
        summary: 'Disable TOTP',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 6 },
          },
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
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as FastifyRequest & { user: { id: string } }).user;
      const { code } = request.body as { code: string };
      await mfaService.disableTOTP(user.id, code);

      return reply.send({
        success: true,
        message: 'TOTP disabled successfully',
      });
    }
  );

  // Setup SMS MFA
  app.post(
    '/auth/mfa/sms/setup',
    {
      preHandler: [authenticate],
      schema: {
        tags: [mfaTag],
        summary: 'Setup SMS MFA',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['phoneNumber'],
          properties: {
            phoneNumber: { type: 'string', pattern: '^\\+[1-9]\\d{1,14}$' },
          },
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
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as FastifyRequest & { user: { id: string } }).user;
      const { phoneNumber } = request.body as { phoneNumber: string };
      await mfaService.setupSMS(user.id, phoneNumber);

      return reply.send({
        success: true,
        message: 'Verification code sent to your phone',
      });
    }
  );

  // Verify SMS setup
  app.post(
    '/auth/mfa/sms/verify',
    {
      preHandler: [authenticate],
      schema: {
        tags: [mfaTag],
        summary: 'Verify SMS MFA setup',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 6 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', properties: { verified: { type: 'boolean' } } },
            },
          },
          400: commonResponses.error,
          401: commonResponses.unauthorized,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as FastifyRequest & { user: { id: string } }).user;
      const { code } = request.body as { code: string };
      const verified = await mfaService.verifySMSSetup(user.id, code);

      return reply.send({
        success: true,
        data: { verified },
      });
    }
  );

  // Setup Email MFA
  app.post(
    '/auth/mfa/email/setup',
    {
      preHandler: [authenticate],
      schema: {
        tags: [mfaTag],
        summary: 'Setup Email MFA',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
          },
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
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as FastifyRequest & { user: { id: string; email: string } }).user;
      const body = request.body as { email?: string };
      const email = body.email || user.email;
      await mfaService.setupEmail(user.id, email);

      return reply.send({
        success: true,
        message: 'Verification code sent to your email',
      });
    }
  );

  // Verify Email setup
  app.post(
    '/auth/mfa/email/verify',
    {
      preHandler: [authenticate],
      schema: {
        tags: [mfaTag],
        summary: 'Verify Email MFA setup',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 6 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', properties: { verified: { type: 'boolean' } } },
            },
          },
          400: commonResponses.error,
          401: commonResponses.unauthorized,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as FastifyRequest & { user: { id: string } }).user;
      const { code } = request.body as { code: string };
      const verified = await mfaService.verifyEmailSetup(user.id, code);

      return reply.send({
        success: true,
        data: { verified },
      });
    }
  );

  // Generate new backup codes
  app.post(
    '/auth/mfa/backup-codes/generate',
    {
      preHandler: [authenticate],
      schema: {
        tags: [mfaTag],
        summary: 'Generate new backup codes',
        description: 'Generates new backup codes (invalidates old ones)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', description: 'Current TOTP code or backup code' },
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
                  codes: { type: 'array', items: { type: 'string' } },
                  generatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          400: commonResponses.error,
          401: commonResponses.unauthorized,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as FastifyRequest & { user: { id: string } }).user;
      const { code } = request.body as { code: string };

      // Verify current MFA first
      const verifyResult = await mfaService.verifyChallenge(user.id, code);
      if (!verifyResult.success) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid verification code',
        });
      }

      const result = await mfaService.generateBackupCodes(user.id);

      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  // Verify MFA (for login flow)
  app.post(
    '/auth/mfa/verify',
    {
      schema: {
        tags: [mfaTag],
        summary: 'Verify MFA code',
        description: 'Verify MFA code during login or sensitive operations',
        body: {
          type: 'object',
          required: ['userId', 'code'],
          properties: {
            userId: { type: 'string' },
            code: { type: 'string' },
            method: { type: 'string', enum: ['totp', 'sms', 'email', 'backup_codes'] },
            challengeId: { type: 'string' },
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
                  verified: { type: 'boolean' },
                  method: { type: 'string' },
                  remainingAttempts: { type: 'number' },
                  lockedUntil: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          400: commonResponses.error,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId, code, method, challengeId } = request.body as {
        userId: string;
        code: string;
        method?: MFAMethod;
        challengeId?: string;
      };
      const result = await mfaService.verifyChallenge(userId, code, method, challengeId);

      return reply.send({
        success: true,
        data: {
          verified: result.success,
          method: result.method,
          remainingAttempts: result.remainingAttempts,
          lockedUntil: result.lockedUntil?.toISOString(),
        },
      });
    }
  );

  // Request MFA challenge (for SMS/email)
  app.post(
    '/auth/mfa/challenge',
    {
      schema: {
        tags: [mfaTag],
        summary: 'Request MFA challenge',
        description: 'Request a new SMS or email verification code',
        body: {
          type: 'object',
          required: ['userId', 'method'],
          properties: {
            userId: { type: 'string' },
            method: { type: 'string', enum: ['sms', 'email'] },
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
                  challengeId: { type: 'string' },
                  expiresAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          400: commonResponses.error,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId, method } = request.body as { userId: string; method: MFAMethod };
      const challenge = await mfaService.createChallenge(userId, method);

      return reply.send({
        success: true,
        data: {
          challengeId: challenge.id,
          expiresAt: challenge.expiresAt.toISOString(),
        },
      });
    }
  );

  // Disable all MFA
  app.delete(
    '/auth/mfa',
    {
      preHandler: [authenticate],
      schema: {
        tags: [mfaTag],
        summary: 'Disable all MFA methods',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['password'],
          properties: {
            password: { type: 'string' },
          },
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
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as FastifyRequest & { user: { id: string } }).user;
      const { password } = request.body as { password: string };

      // Verify password before disabling MFA
      const isValid = await authService.verifyPasswordById(user.id, password);
      if (!isValid) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid password',
        });
      }

      await mfaService.disableAllMFA(user.id);

      return reply.send({
        success: true,
        message: 'All MFA methods disabled',
      });
    }
  );
}
