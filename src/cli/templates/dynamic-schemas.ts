import type { FieldDefinition } from '../utils/field-parser.js';
import { zodTypeMap, joiTypeMap, yupTypeMap } from '../utils/field-parser.js';

export type ValidatorType = 'zod' | 'joi' | 'yup';

export function dynamicSchemasTemplate(
  name: string,
  pascalName: string,
  camelName: string,
  fields: FieldDefinition[],
  validator: ValidatorType = 'zod'
): string {
  switch (validator) {
    case 'joi':
      return generateJoiSchemas(pascalName, camelName, fields);
    case 'yup':
      return generateYupSchemas(pascalName, camelName, fields);
    default:
      return generateZodSchemas(pascalName, camelName, fields);
  }
}

function generateZodSchemas(
  pascalName: string,
  camelName: string,
  fields: FieldDefinition[]
): string {
  const createFields = fields.map((field) => {
    let validator = zodTypeMap[field.type];

    if (field.isArray) {
      validator = `z.array(${validator})`;
    }

    if (field.isOptional) {
      validator += '.optional()';
    }

    if (field.defaultValue) {
      validator += `.default(${field.defaultValue})`;
    }

    // Add extra validations based on type
    if (field.type === 'string' && !field.isOptional) {
      validator = validator.replace('z.string()', 'z.string().min(1)');
    }

    return `  ${field.name}: ${validator},`;
  });

  const updateFields = fields.map((field) => {
    let validator = zodTypeMap[field.type];

    if (field.isArray) {
      validator = `z.array(${validator})`;
    }

    validator += '.optional()';

    return `  ${field.name}: ${validator},`;
  });

  return `import { z } from 'zod';

export const create${pascalName}Schema = z.object({
${createFields.join('\n')}
});

export const update${pascalName}Schema = z.object({
${updateFields.join('\n')}
});

export const ${camelName}QuerySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

export type Create${pascalName}Input = z.infer<typeof create${pascalName}Schema>;
export type Update${pascalName}Input = z.infer<typeof update${pascalName}Schema>;
export type ${pascalName}QueryInput = z.infer<typeof ${camelName}QuerySchema>;
`;
}

function generateJoiSchemas(
  pascalName: string,
  camelName: string,
  fields: FieldDefinition[]
): string {
  const createFields = fields.map((field) => {
    let validator = joiTypeMap[field.type];

    if (field.isArray) {
      validator = `Joi.array().items(${validator})`;
    }

    if (!field.isOptional) {
      validator += '.required()';
    }

    if (field.defaultValue) {
      validator += `.default(${field.defaultValue})`;
    }

    return `  ${field.name}: ${validator},`;
  });

  const updateFields = fields.map((field) => {
    let validator = joiTypeMap[field.type];

    if (field.isArray) {
      validator = `Joi.array().items(${validator})`;
    }

    return `  ${field.name}: ${validator},`;
  });

  return `import Joi from 'joi';

export const create${pascalName}Schema = Joi.object({
${createFields.join('\n')}
});

export const update${pascalName}Schema = Joi.object({
${updateFields.join('\n')}
});

export const ${camelName}QuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  sortBy: Joi.string(),
  sortOrder: Joi.string().valid('asc', 'desc'),
  search: Joi.string(),
});

export type Create${pascalName}Input = {
${fields.map((f) => `  ${f.name}${f.isOptional ? '?' : ''}: ${getJsType(f)};`).join('\n')}
};

export type Update${pascalName}Input = Partial<Create${pascalName}Input>;
export type ${pascalName}QueryInput = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
};
`;
}

function generateYupSchemas(
  pascalName: string,
  camelName: string,
  fields: FieldDefinition[]
): string {
  const createFields = fields.map((field) => {
    let validator = yupTypeMap[field.type];

    if (field.isArray) {
      validator = `yup.array().of(${validator})`;
    }

    if (!field.isOptional) {
      validator += '.required()';
    }

    if (field.defaultValue) {
      validator += `.default(${field.defaultValue})`;
    }

    return `  ${field.name}: ${validator},`;
  });

  const updateFields = fields.map((field) => {
    let validator = yupTypeMap[field.type];

    if (field.isArray) {
      validator = `yup.array().of(${validator})`;
    }

    validator += '.optional()';

    return `  ${field.name}: ${validator},`;
  });

  return `import * as yup from 'yup';

export const create${pascalName}Schema = yup.object({
${createFields.join('\n')}
});

export const update${pascalName}Schema = yup.object({
${updateFields.join('\n')}
});

export const ${camelName}QuerySchema = yup.object({
  page: yup.number().integer().min(1),
  limit: yup.number().integer().min(1).max(100),
  sortBy: yup.string(),
  sortOrder: yup.string().oneOf(['asc', 'desc']),
  search: yup.string(),
});

export type Create${pascalName}Input = yup.InferType<typeof create${pascalName}Schema>;
export type Update${pascalName}Input = yup.InferType<typeof update${pascalName}Schema>;
export type ${pascalName}QueryInput = yup.InferType<typeof ${camelName}QuerySchema>;
`;
}

function getJsType(field: FieldDefinition): string {
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    date: 'Date',
    datetime: 'Date',
    text: 'string',
    json: 'Record<string, unknown>',
    email: 'string',
    url: 'string',
    uuid: 'string',
    int: 'number',
    float: 'number',
    decimal: 'number',
    enum: 'string',
  };

  const baseType = typeMap[field.type] || 'unknown';
  return field.isArray ? `${baseType}[]` : baseType;
}
