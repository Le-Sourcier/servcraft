export interface FieldDefinition {
  name: string;
  type: FieldType;
  isOptional: boolean;
  isArray: boolean;
  isUnique: boolean;
  defaultValue?: string;
  relation?: {
    model: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-one';
  };
}

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'text'
  | 'json'
  | 'email'
  | 'url'
  | 'uuid'
  | 'int'
  | 'float'
  | 'decimal'
  | 'enum';

// Map field types to TypeScript types
export const tsTypeMap: Record<FieldType, string> = {
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

// Map field types to Prisma types
export const prismaTypeMap: Record<FieldType, string> = {
  string: 'String',
  number: 'Int',
  boolean: 'Boolean',
  date: 'DateTime',
  datetime: 'DateTime',
  text: 'String',
  json: 'Json',
  email: 'String',
  url: 'String',
  uuid: 'String',
  int: 'Int',
  float: 'Float',
  decimal: 'Decimal',
  enum: 'String',
};

// Map field types to Zod validators
export const zodTypeMap: Record<FieldType, string> = {
  string: 'z.string()',
  number: 'z.number()',
  boolean: 'z.boolean()',
  date: 'z.coerce.date()',
  datetime: 'z.coerce.date()',
  text: 'z.string()',
  json: 'z.record(z.unknown())',
  email: 'z.string().email()',
  url: 'z.string().url()',
  uuid: 'z.string().uuid()',
  int: 'z.number().int()',
  float: 'z.number()',
  decimal: 'z.number()',
  enum: 'z.string()',
};

// Map field types to Joi validators
export const joiTypeMap: Record<FieldType, string> = {
  string: 'Joi.string()',
  number: 'Joi.number()',
  boolean: 'Joi.boolean()',
  date: 'Joi.date()',
  datetime: 'Joi.date()',
  text: 'Joi.string()',
  json: 'Joi.object()',
  email: 'Joi.string().email()',
  url: 'Joi.string().uri()',
  uuid: 'Joi.string().uuid()',
  int: 'Joi.number().integer()',
  float: 'Joi.number()',
  decimal: 'Joi.number()',
  enum: 'Joi.string()',
};

// Map field types to Yup validators
export const yupTypeMap: Record<FieldType, string> = {
  string: 'yup.string()',
  number: 'yup.number()',
  boolean: 'yup.boolean()',
  date: 'yup.date()',
  datetime: 'yup.date()',
  text: 'yup.string()',
  json: 'yup.object()',
  email: 'yup.string().email()',
  url: 'yup.string().url()',
  uuid: 'yup.string().uuid()',
  int: 'yup.number().integer()',
  float: 'yup.number()',
  decimal: 'yup.number()',
  enum: 'yup.string()',
};

/**
 * Parse field definition string
 * Format: name:type[:modifiers]
 * Examples:
 *   - title:string
 *   - price:number
 *   - email:email:unique
 *   - description:text?
 *   - tags:string[]
 *   - isActive:boolean:default=true
 *   - category:relation:Category
 */
export function parseField(fieldStr: string): FieldDefinition {
  const parts = fieldStr.split(':');
  let name = parts[0] || '';
  let typeStr = parts[1] || 'string';
  const modifiers = parts.slice(2);

  // Check for optional (?)
  const isOptional = name.endsWith('?') || typeStr.endsWith('?');
  name = name.replace('?', '');
  typeStr = typeStr.replace('?', '');

  // Check for array ([])
  const isArray = typeStr.endsWith('[]');
  typeStr = typeStr.replace('[]', '');

  // Validate type
  const validTypes: FieldType[] = [
    'string', 'number', 'boolean', 'date', 'datetime',
    'text', 'json', 'email', 'url', 'uuid', 'int', 'float', 'decimal', 'enum'
  ];

  let type: FieldType = 'string';
  if (validTypes.includes(typeStr as FieldType)) {
    type = typeStr as FieldType;
  }

  // Parse modifiers
  let isUnique = false;
  let defaultValue: string | undefined;
  let relation: FieldDefinition['relation'];

  for (const mod of modifiers) {
    if (mod === 'unique') {
      isUnique = true;
    } else if (mod.startsWith('default=')) {
      defaultValue = mod.replace('default=', '');
    } else if (typeStr === 'relation') {
      relation = {
        model: mod,
        type: 'many-to-one',
      };
      type = 'string'; // Relations use string IDs
    }
  }

  return {
    name,
    type,
    isOptional,
    isArray,
    isUnique,
    defaultValue,
    relation,
  };
}

/**
 * Parse multiple fields from command line
 * Example: "title:string price:number description:text?"
 */
export function parseFields(fieldsStr: string): FieldDefinition[] {
  if (!fieldsStr) return [];

  return fieldsStr
    .split(/\s+/)
    .filter(Boolean)
    .map(parseField);
}

/**
 * Generate TypeScript interface from fields
 */
export function generateTypeInterface(
  name: string,
  fields: FieldDefinition[],
  includeBase = true
): string {
  const lines: string[] = [];

  if (includeBase) {
    lines.push(`import type { BaseEntity } from '../../types/index.js';`);
    lines.push('');
    lines.push(`export interface ${name} extends BaseEntity {`);
  } else {
    lines.push(`export interface ${name} {`);
  }

  for (const field of fields) {
    const tsType = tsTypeMap[field.type];
    const arrayMark = field.isArray ? '[]' : '';
    const optionalMark = field.isOptional ? '?' : '';
    lines.push(`  ${field.name}${optionalMark}: ${tsType}${arrayMark};`);
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate Zod schema from fields
 */
export function generateZodSchema(
  name: string,
  fields: FieldDefinition[],
  schemaType: 'create' | 'update' = 'create'
): string {
  const lines: string[] = [];

  lines.push(`export const ${schemaType}${name}Schema = z.object({`);

  for (const field of fields) {
    let validator = zodTypeMap[field.type];

    if (field.isArray) {
      validator = `z.array(${validator})`;
    }

    if (field.isOptional || schemaType === 'update') {
      validator += '.optional()';
    }

    if (field.defaultValue && schemaType === 'create') {
      validator += `.default(${field.defaultValue})`;
    }

    lines.push(`  ${field.name}: ${validator},`);
  }

  lines.push('});');

  return lines.join('\n');
}

/**
 * Generate Prisma model from fields
 */
export function generatePrismaModel(
  modelName: string,
  tableName: string,
  fields: FieldDefinition[]
): string {
  const lines: string[] = [];

  lines.push(`model ${modelName} {`);
  lines.push('  id          String   @id @default(uuid())');

  for (const field of fields) {
    const prismaType = prismaTypeMap[field.type];
    const optionalMark = field.isOptional ? '?' : '';
    const annotations: string[] = [];

    if (field.isUnique) {
      annotations.push('@unique');
    }

    if (field.defaultValue) {
      annotations.push(`@default(${field.defaultValue})`);
    }

    if (field.type === 'text') {
      annotations.push('@db.Text');
    }

    const annotationStr = annotations.length > 0 ? ' ' + annotations.join(' ') : '';
    lines.push(`  ${field.name.padEnd(11)} ${prismaType}${optionalMark}${annotationStr}`);
  }

  lines.push('');
  lines.push('  createdAt   DateTime @default(now())');
  lines.push('  updatedAt   DateTime @updatedAt');
  lines.push('');

  // Add indexes for unique fields
  const uniqueFields = fields.filter(f => f.isUnique);
  for (const field of uniqueFields) {
    lines.push(`  @@index([${field.name}])`);
  }

  lines.push(`  @@map("${tableName}")`);
  lines.push('}');

  return lines.join('\n');
}
