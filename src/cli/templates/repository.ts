export function repositoryTemplate(name: string, pascalName: string, camelName: string, pluralName: string): string {
  return `import { randomUUID } from 'crypto';
import type { PaginatedResult, PaginationParams } from '../../types/index.js';
import { createPaginatedResult, getSkip } from '../../utils/pagination.js';
import type { ${pascalName}, Create${pascalName}Data, Update${pascalName}Data, ${pascalName}Filters } from './${name}.types.js';

// In-memory storage (will be replaced by Prisma in production)
const ${pluralName} = new Map<string, ${pascalName}>();

export class ${pascalName}Repository {
  async findById(id: string): Promise<${pascalName} | null> {
    return ${pluralName}.get(id) || null;
  }

  async findMany(
    params: PaginationParams,
    filters?: ${pascalName}Filters
  ): Promise<PaginatedResult<${pascalName}>> {
    let items = Array.from(${pluralName}.values());

    // Apply filters
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      items = items.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(search)
      );
    }

    // Sort
    if (params.sortBy) {
      const sortKey = params.sortBy as keyof ${pascalName};
      items.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal === undefined || bVal === undefined) return 0;
        if (aVal < bVal) return params.sortOrder === 'desc' ? 1 : -1;
        if (aVal > bVal) return params.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    const total = items.length;
    const skip = getSkip(params);
    const data = items.slice(skip, skip + params.limit);

    return createPaginatedResult(data, total, params);
  }

  async create(data: Create${pascalName}Data): Promise<${pascalName}> {
    const now = new Date();
    const item: ${pascalName} = {
      id: randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    ${pluralName}.set(item.id, item);
    return item;
  }

  async update(id: string, data: Update${pascalName}Data): Promise<${pascalName} | null> {
    const item = ${pluralName}.get(id);
    if (!item) return null;

    const updated: ${pascalName} = {
      ...item,
      ...data,
      updatedAt: new Date(),
    };

    ${pluralName}.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return ${pluralName}.delete(id);
  }

  async count(filters?: ${pascalName}Filters): Promise<number> {
    if (!filters) return ${pluralName}.size;

    let count = 0;
    for (const item of ${pluralName}.values()) {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (!JSON.stringify(item).toLowerCase().includes(search)) continue;
      }
      count++;
    }
    return count;
  }

  // Clear all (for testing)
  async clear(): Promise<void> {
    ${pluralName}.clear();
  }
}

export function create${pascalName}Repository(): ${pascalName}Repository {
  return new ${pascalName}Repository();
}
`;
}
