export function controllerTestTemplate(
  name: string,
  pascalName: string,
  camelName: string
): string {
  return `import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../../app.js';
import { FastifyInstance } from 'fastify';

describe('${pascalName}Controller', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /${name}', () => {
    it('should return list of ${name}', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/${name}',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('data');
    });
  });

  describe('GET /${name}/:id', () => {
    it('should return a single ${camelName}', async () => {
      // TODO: Create test ${camelName} first
      const response = await app.inject({
        method: 'GET',
        url: '/${name}/1',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('data');
    });

    it('should return 404 for non-existent ${camelName}', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/${name}/999999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /${name}', () => {
    it('should create a new ${camelName}', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/${name}',
        payload: {
          // TODO: Add required fields
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toHaveProperty('data');
    });

    it('should return 400 for invalid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/${name}',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PUT /${name}/:id', () => {
    it('should update a ${camelName}', async () => {
      // TODO: Create test ${camelName} first
      const response = await app.inject({
        method: 'PUT',
        url: '/${name}/1',
        payload: {
          // TODO: Add fields to update
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('data');
    });
  });

  describe('DELETE /${name}/:id', () => {
    it('should delete a ${camelName}', async () => {
      // TODO: Create test ${camelName} first
      const response = await app.inject({
        method: 'DELETE',
        url: '/${name}/1',
      });

      expect(response.statusCode).toBe(204);
    });
  });
});
`;
}
