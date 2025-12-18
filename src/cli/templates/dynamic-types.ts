import type { FieldDefinition } from '../utils/field-parser.js';
import { tsTypeMap } from '../utils/field-parser.js';

export function dynamicTypesTemplate(
  name: string,
  pascalName: string,
  fields: FieldDefinition[]
): string {
  const fieldLines = fields.map((field) => {
    const tsType = tsTypeMap[field.type];
    const arrayMark = field.isArray ? '[]' : '';
    const optionalMark = field.isOptional ? '?' : '';
    return `  ${field.name}${optionalMark}: ${tsType}${arrayMark};`;
  });

  const createFieldLines = fields
    .filter((f) => !f.isOptional)
    .map((field) => {
      const tsType = tsTypeMap[field.type];
      const arrayMark = field.isArray ? '[]' : '';
      return `  ${field.name}: ${tsType}${arrayMark};`;
    });

  const createOptionalLines = fields
    .filter((f) => f.isOptional)
    .map((field) => {
      const tsType = tsTypeMap[field.type];
      const arrayMark = field.isArray ? '[]' : '';
      return `  ${field.name}?: ${tsType}${arrayMark};`;
    });

  const updateFieldLines = fields.map((field) => {
    const tsType = tsTypeMap[field.type];
    const arrayMark = field.isArray ? '[]' : '';
    return `  ${field.name}?: ${tsType}${arrayMark};`;
  });

  return `import type { BaseEntity } from '../../types/index.js';

export interface ${pascalName} extends BaseEntity {
${fieldLines.join('\n')}
}

export interface Create${pascalName}Data {
${[...createFieldLines, ...createOptionalLines].join('\n')}
}

export interface Update${pascalName}Data {
${updateFieldLines.join('\n')}
}

export interface ${pascalName}Filters {
  search?: string;
${fields
  .filter((f) => ['string', 'enum', 'boolean'].includes(f.type))
  .map((f) => `  ${f.name}?: ${tsTypeMap[f.type]};`)
  .join('\n')}
}
`;
}
