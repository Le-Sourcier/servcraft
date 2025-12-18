export function typesTemplate(name: string, pascalName: string): string {
  return `import type { BaseEntity } from '../../types/index.js';

export interface ${pascalName} extends BaseEntity {
  // Add your ${pascalName} specific fields here
  name: string;
  description?: string;
  // status?: string;
  // metadata?: Record<string, unknown>;
}

export interface Create${pascalName}Data {
  name: string;
  description?: string;
}

export interface Update${pascalName}Data {
  name?: string;
  description?: string;
}

export interface ${pascalName}Filters {
  search?: string;
  // Add more filters as needed
}
`;
}
