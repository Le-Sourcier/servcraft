export function moduleIndexTemplate(name: string, pascalName: string, camelName: string): string {
  return `import type { FastifyInstance } from 'fastify';
import { logger } from '../../core/logger.js';
import { ${pascalName}Service, create${pascalName}Service } from './${name}.service.js';
import { ${pascalName}Controller, create${pascalName}Controller } from './${name}.controller.js';
import { ${pascalName}Repository, create${pascalName}Repository } from './${name}.repository.js';
import { register${pascalName}Routes } from './${name}.routes.js';
import type { AuthService } from '../auth/auth.service.js';

export async function register${pascalName}Module(
  app: FastifyInstance,
  authService: AuthService
): Promise<void> {
  // Create repository and service
  const repository = create${pascalName}Repository();
  const ${camelName}Service = create${pascalName}Service(repository);

  // Create controller
  const ${camelName}Controller = create${pascalName}Controller(${camelName}Service);

  // Register routes
  register${pascalName}Routes(app, ${camelName}Controller, authService);

  logger.info('${pascalName} module registered');
}

export { ${pascalName}Service, create${pascalName}Service } from './${name}.service.js';
export { ${pascalName}Controller, create${pascalName}Controller } from './${name}.controller.js';
export { ${pascalName}Repository, create${pascalName}Repository } from './${name}.repository.js';
export * from './${name}.types.js';
export * from './${name}.schemas.js';
`;
}
