export function serviceTemplate(name: string, pascalName: string, camelName: string): string {
  return `import type { PaginatedResult, PaginationParams } from '../../types/index.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';
import { ${pascalName}Repository, create${pascalName}Repository } from './${name}.repository.js';
import type { ${pascalName}, Create${pascalName}Data, Update${pascalName}Data, ${pascalName}Filters } from './${name}.types.js';
import { logger } from '../../core/logger.js';

export class ${pascalName}Service {
  constructor(private repository: ${pascalName}Repository) {}

  async findById(id: string): Promise<${pascalName} | null> {
    return this.repository.findById(id);
  }

  async findMany(
    params: PaginationParams,
    filters?: ${pascalName}Filters
  ): Promise<PaginatedResult<${pascalName}>> {
    return this.repository.findMany(params, filters);
  }

  async create(data: Create${pascalName}Data): Promise<${pascalName}> {
    const item = await this.repository.create(data);
    logger.info({ ${camelName}Id: item.id }, '${pascalName} created');
    return item;
  }

  async update(id: string, data: Update${pascalName}Data): Promise<${pascalName}> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('${pascalName}');
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new NotFoundError('${pascalName}');
    }

    logger.info({ ${camelName}Id: id }, '${pascalName} updated');
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('${pascalName}');
    }

    await this.repository.delete(id);
    logger.info({ ${camelName}Id: id }, '${pascalName} deleted');
  }
}

export function create${pascalName}Service(repository?: ${pascalName}Repository): ${pascalName}Service {
  return new ${pascalName}Service(repository || create${pascalName}Repository());
}
`;
}
