export function integrationTestTemplate(
  name: string,
  pascalName: string,
  camelName: string
): string {
  return `import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../../app.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';

describe('${pascalName} Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    // await prisma.${camelName}.deleteMany();
  });

  describe('Full CRUD workflow', () => {
    it('should create, read, update, and delete a ${camelName}', async () => {
      // Create
      const createResponse = await app.inject({
        method: 'POST',
        url: '/${name}',
        payload: {
          // TODO: Add required fields
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const created = createResponse.json().data;
      expect(created.id).toBeDefined();

      // Read
      const readResponse = await app.inject({
        method: 'GET',
        url: \`/${name}/\${created.id}\`,
      });

      expect(readResponse.statusCode).toBe(200);
      const read = readResponse.json().data;
      expect(read.id).toBe(created.id);

      // Update
      const updateResponse = await app.inject({
        method: 'PUT',
        url: \`/${name}/\${created.id}\`,
        payload: {
          // TODO: Add fields to update
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const updated = updateResponse.json().data;
      expect(updated.id).toBe(created.id);

      // Delete
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: \`/${name}/\${created.id}\`,
      });

      expect(deleteResponse.statusCode).toBe(204);

      // Verify deletion
      const verifyResponse = await app.inject({
        method: 'GET',
        url: \`/${name}/\${created.id}\`,
      });

      expect(verifyResponse.statusCode).toBe(404);
    });
  });

  describe('List and pagination', () => {
    it('should list ${name} with pagination', async () => {
      // Create multiple ${name}
      const count = 5;
      for (let i = 0; i < count; i++) {
        await app.inject({
          method: 'POST',
          url: '/${name}',
          payload: {
            // TODO: Add required fields
          },
        });
      }

      // Test pagination
      const response = await app.inject({
        method: 'GET',
        url: '/${name}?page=1&limit=3',
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeLessThanOrEqual(3);
      expect(result.total).toBeGreaterThanOrEqual(count);
    });
  });

  describe('Validation', () => {
    it('should validate required fields on create', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/${name}',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error');
    });

    it('should validate data types', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/${name}',
        payload: {
          // TODO: Add invalid field types
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
`;
}
