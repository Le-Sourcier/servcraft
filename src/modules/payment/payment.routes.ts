import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthService } from '../auth/auth.service.js';
import { createAuthMiddleware } from '../auth/auth.middleware.js';
import { commonResponses, idParam } from '../swagger/index.js';
import { getPaymentService } from './payment.service.js';
import type { CreatePaymentData, PaymentProvider } from './types.js';

const paymentTag = 'Payments';

const paymentResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: {
          type: 'string',
          enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
        },
        amount: { type: 'number' },
        currency: { type: 'string' },
        provider: { type: 'string', enum: ['stripe', 'paypal', 'mobile_money', 'manual'] },
        clientSecret: { type: 'string' },
      },
    },
  },
};

const createPaymentBody = {
  type: 'object',
  required: ['amount', 'currency', 'provider'],
  properties: {
    amount: { type: 'number', minimum: 0.01, description: 'Payment amount' },
    currency: { type: 'string', minLength: 3, maxLength: 3, description: 'ISO 4217 currency code' },
    provider: {
      type: 'string',
      enum: ['stripe', 'paypal', 'mobile_money'],
      description: 'Payment provider',
    },
    method: { type: 'string', enum: ['card', 'bank_transfer', 'mobile_money', 'paypal'] },
    description: { type: 'string' },
    metadata: { type: 'object', additionalProperties: true },
    returnUrl: {
      type: 'string',
      format: 'uri',
      description: 'URL to redirect after payment (PayPal)',
    },
    cancelUrl: { type: 'string', format: 'uri', description: 'URL to redirect on cancel (PayPal)' },
  },
};

const subscriptionBody = {
  type: 'object',
  required: ['planId'],
  properties: {
    planId: { type: 'string', format: 'uuid' },
    provider: { type: 'string', enum: ['stripe', 'paypal'], default: 'stripe' },
  },
};

export function registerPaymentRoutes(app: FastifyInstance, authService: AuthService): void {
  const authenticate = createAuthMiddleware(authService);
  const paymentService = getPaymentService();

  // Create payment intent
  app.post(
    '/payments',
    {
      preHandler: [authenticate],
      schema: {
        tags: [paymentTag],
        summary: 'Create a payment intent',
        description:
          'Creates a payment intent with the specified provider (Stripe, PayPal, or Mobile Money)',
        security: [{ bearerAuth: [] }],
        body: createPaymentBody,
        response: {
          201: paymentResponse,
          400: commonResponses.error,
          401: commonResponses.unauthorized,
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreatePaymentData }>, reply: FastifyReply) => {
      const userId = (request as FastifyRequest & { user: { id: string } }).user.id;
      const intent = await paymentService.createPayment({ ...request.body, userId });
      return reply.status(201).send({ success: true, data: intent });
    }
  );

  // Confirm payment
  app.post(
    '/payments/:id/confirm',
    {
      preHandler: [authenticate],
      schema: {
        tags: [paymentTag],
        summary: 'Confirm a payment',
        security: [{ bearerAuth: [] }],
        params: idParam,
        response: {
          200: paymentResponse,
          400: commonResponses.error,
          401: commonResponses.unauthorized,
          404: commonResponses.notFound,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const payment = await paymentService.confirmPayment(request.params.id);
      return reply.send({ success: true, data: payment });
    }
  );

  // Get payment by ID
  app.get(
    '/payments/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: [paymentTag],
        summary: 'Get payment details',
        security: [{ bearerAuth: [] }],
        params: idParam,
        response: {
          200: paymentResponse,
          401: commonResponses.unauthorized,
          404: commonResponses.notFound,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const payment = await paymentService.getPayment(request.params.id);
      if (!payment) {
        return reply.status(404).send({ success: false, message: 'Payment not found' });
      }
      return reply.send({ success: true, data: payment });
    }
  );

  // Get user payments
  app.get(
    '/payments',
    {
      preHandler: [authenticate],
      schema: {
        tags: [paymentTag],
        summary: 'Get user payments',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: { type: 'object' } },
            },
          },
          401: commonResponses.unauthorized,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as FastifyRequest & { user: { id: string } }).user.id;
      const payments = await paymentService.getUserPayments(userId);
      return reply.send({ success: true, data: payments });
    }
  );

  // Refund payment
  app.post(
    '/payments/:id/refund',
    {
      preHandler: [authenticate],
      schema: {
        tags: [paymentTag],
        summary: 'Refund a payment',
        security: [{ bearerAuth: [] }],
        params: idParam,
        body: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              minimum: 0.01,
              description: 'Partial refund amount (optional)',
            },
          },
        },
        response: {
          200: paymentResponse,
          400: commonResponses.error,
          401: commonResponses.unauthorized,
          404: commonResponses.notFound,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { amount?: number } }>,
      reply: FastifyReply
    ) => {
      const payment = await paymentService.refundPayment(request.params.id, request.body.amount);
      return reply.send({ success: true, data: payment });
    }
  );

  // Subscriptions
  app.post(
    '/subscriptions',
    {
      preHandler: [authenticate],
      schema: {
        tags: [paymentTag],
        summary: 'Create a subscription',
        security: [{ bearerAuth: [] }],
        body: subscriptionBody,
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
          400: commonResponses.error,
          401: commonResponses.unauthorized,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { planId: string; provider?: PaymentProvider } }>,
      reply: FastifyReply
    ) => {
      const userId = (request as FastifyRequest & { user: { id: string } }).user.id;
      const subscription = await paymentService.createSubscription(
        userId,
        request.body.planId,
        request.body.provider
      );
      return reply.status(201).send({ success: true, data: subscription });
    }
  );

  app.delete(
    '/subscriptions/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: [paymentTag],
        summary: 'Cancel a subscription',
        security: [{ bearerAuth: [] }],
        params: idParam,
        response: {
          200: {
            type: 'object',
            properties: { success: { type: 'boolean' }, data: { type: 'object' } },
          },
          401: commonResponses.unauthorized,
          404: commonResponses.notFound,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const subscription = await paymentService.cancelSubscription(request.params.id);
      return reply.send({ success: true, data: subscription });
    }
  );

  app.get(
    '/subscriptions',
    {
      preHandler: [authenticate],
      schema: {
        tags: [paymentTag],
        summary: 'Get user subscriptions',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: { success: { type: 'boolean' }, data: { type: 'array' } },
          },
          401: commonResponses.unauthorized,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as FastifyRequest & { user: { id: string } }).user.id;
      const subscriptions = await paymentService.getUserSubscriptions(userId);
      return reply.send({ success: true, data: subscriptions });
    }
  );

  // Plans
  app.get(
    '/plans',
    {
      schema: {
        tags: [paymentTag],
        summary: 'Get available subscription plans',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    amount: { type: 'number' },
                    currency: { type: 'string' },
                    interval: { type: 'string' },
                    features: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const plans = await paymentService.getPlans();
      return reply.send({ success: true, data: plans });
    }
  );

  // Webhooks (no auth - verified by signature)
  app.post(
    '/webhooks/stripe',
    {
      schema: {
        tags: [paymentTag],
        summary: 'Stripe webhook endpoint',
        description: 'Receives Stripe webhook events',
        body: { type: 'string' },
        response: {
          200: { type: 'object', properties: { received: { type: 'boolean' } } },
        },
      },
      config: { rawBody: true },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers['stripe-signature'] as string;
      await paymentService.handleWebhook('stripe', request.body as string, signature);
      return reply.send({ received: true });
    }
  );

  app.post(
    '/webhooks/paypal',
    {
      schema: {
        tags: [paymentTag],
        summary: 'PayPal webhook endpoint',
        body: { type: 'object' },
        response: {
          200: { type: 'object', properties: { received: { type: 'boolean' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers['paypal-transmission-sig'] as string;
      await paymentService.handleWebhook('paypal', JSON.stringify(request.body), signature);
      return reply.send({ received: true });
    }
  );

  app.post(
    '/webhooks/mobile-money',
    {
      schema: {
        tags: [paymentTag],
        summary: 'Mobile Money callback endpoint',
        body: { type: 'object' },
        response: {
          200: { type: 'object', properties: { received: { type: 'boolean' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await paymentService.handleWebhook('mobile_money', JSON.stringify(request.body), '');
      return reply.send({ received: true });
    }
  );
}
