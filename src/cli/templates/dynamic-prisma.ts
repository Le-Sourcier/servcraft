import type { FieldDefinition } from '../utils/field-parser.js';
import { prismaTypeMap } from '../utils/field-parser.js';

export function dynamicPrismaTemplate(
  modelName: string,
  tableName: string,
  fields: FieldDefinition[]
): string {
  const fieldLines: string[] = [];

  for (const field of fields) {
    const prismaType = prismaTypeMap[field.type];
    const optionalMark = field.isOptional ? '?' : '';
    const arrayMark = field.isArray ? '[]' : '';
    const annotations: string[] = [];

    if (field.isUnique) {
      annotations.push('@unique');
    }

    if (field.defaultValue !== undefined) {
      // Handle different default value types
      if (field.type === 'boolean') {
        annotations.push(`@default(${field.defaultValue})`);
      } else if (field.type === 'number' || field.type === 'int' || field.type === 'float') {
        annotations.push(`@default(${field.defaultValue})`);
      } else {
        annotations.push(`@default("${field.defaultValue}")`);
      }
    }

    // Database-specific annotations
    if (field.type === 'text') {
      annotations.push('@db.Text');
    }

    if (field.type === 'decimal') {
      annotations.push('@db.Decimal(10, 2)');
    }

    const annotationStr = annotations.length > 0 ? '  ' + annotations.join(' ') : '';
    const typePart = `${prismaType}${optionalMark}${arrayMark}`;

    fieldLines.push(`  ${field.name.padEnd(15)} ${typePart.padEnd(12)}${annotationStr}`);
  }

  // Generate indexes
  const indexLines: string[] = [];

  // Index for unique fields
  const uniqueFields = fields.filter((f) => f.isUnique);
  for (const field of uniqueFields) {
    indexLines.push(`  @@index([${field.name}])`);
  }

  // Index for common search fields
  const searchableFields = fields.filter(
    (f) => ['string', 'email'].includes(f.type) && !f.isUnique
  );
  if (searchableFields.length > 0) {
    const firstSearchable = searchableFields[0];
    if (firstSearchable) {
      indexLines.push(`  @@index([${firstSearchable.name}])`);
    }
  }

  return `
// ==========================================
// Add this model to your prisma/schema.prisma file
// ==========================================

model ${modelName} {
  id              String    @id @default(uuid())

${fieldLines.join('\n')}

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

${indexLines.join('\n')}
  @@map("${tableName}")
}

// ==========================================
// After adding the model, run:
// npm run db:migrate -- --name add_${tableName}
// ==========================================
`;
}
