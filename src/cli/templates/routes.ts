export function routesTemplate(
  name: string,
  pascalName: string,
  camelName: string,
  pluralName: string
): string {
  return `import type { FastifyInstance } from 'fastify';
import type { ${pascalName}Controller } from './${name}.controller.js';
import type { AuthService } from '../auth/auth.service.js';
import { createAuthMiddleware, createRoleMiddleware } from '../auth/auth.middleware.js';

export function register${pascalName}Routes(
  app: FastifyInstance,
  controller: ${pascalName}Controller,
  authService: AuthService
): void {
  const authenticate = createAuthMiddleware(authService);
  const isAdmin = createRoleMiddleware(['admin', 'super_admin']);

  // Public routes (if any)
  // app.get('/${pluralName}/public', controller.publicList.bind(controller));

  // Protected routes
  app.get(
    '/${pluralName}',
    { preHandler: [authenticate] },
    controller.list.bind(controller)
  );

  app.get(
    '/${pluralName}/:id',
    { preHandler: [authenticate] },
    controller.getById.bind(controller)
  );

  app.post(
    '/${pluralName}',
    { preHandler: [authenticate] },
    controller.create.bind(controller)
  );

  app.patch(
    '/${pluralName}/:id',
    { preHandler: [authenticate] },
    controller.update.bind(controller)
  );

  app.delete(
    '/${pluralName}/:id',
    { preHandler: [authenticate, isAdmin] },
    controller.delete.bind(controller)
  );
}
`;
}
