export function schemasTemplate(name: string, pascalName: string, camelName: string): string {
  return `import { z } from 'zod';

export const create${pascalName}Schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
});

export const update${pascalName}Schema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
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
