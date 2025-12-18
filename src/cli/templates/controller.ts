export function controllerTemplate(name: string, pascalName: string, camelName: string): string {
  return `import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ${pascalName}Service } from './${name}.service.js';
import { create${pascalName}Schema, update${pascalName}Schema, ${camelName}QuerySchema } from './${name}.schemas.js';
import { success, created, noContent } from '../../utils/response.js';
import { parsePaginationParams } from '../../utils/pagination.js';
import { validateBody, validateQuery } from '../validation/validator.js';

export class ${pascalName}Controller {
  constructor(private ${camelName}Service: ${pascalName}Service) {}

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = validateQuery(${camelName}QuerySchema, request.query);
    const pagination = parsePaginationParams(query);
    const filters = {
      search: query.search,
    };

    const result = await this.${camelName}Service.findMany(pagination, filters);
    success(reply, result);
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const item = await this.${camelName}Service.findById(request.params.id);

    if (!item) {
      return reply.status(404).send({
        success: false,
        message: '${pascalName} not found',
      });
    }

    success(reply, item);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = validateBody(create${pascalName}Schema, request.body);
    const item = await this.${camelName}Service.create(data);
    created(reply, item);
  }

  async update(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const data = validateBody(update${pascalName}Schema, request.body);
    const item = await this.${camelName}Service.update(request.params.id, data);
    success(reply, item);
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    await this.${camelName}Service.delete(request.params.id);
    noContent(reply);
  }
}

export function create${pascalName}Controller(${camelName}Service: ${pascalName}Service): ${pascalName}Controller {
  return new ${pascalName}Controller(${camelName}Service);
}
`;
}
