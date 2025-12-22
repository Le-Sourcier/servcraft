export function serviceTestTemplate(name: string, pascalName: string, camelName: string): string {
  return `import { describe, it, expect, beforeEach } from 'vitest';
import { ${pascalName}Service } from '../${name}.service.js';

describe('${pascalName}Service', () => {
  let service: ${pascalName}Service;

  beforeEach(() => {
    service = new ${pascalName}Service();
  });

  describe('getAll', () => {
    it('should return all ${name}', async () => {
      const result = await service.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply pagination', async () => {
      const result = await service.getAll({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getById', () => {
    it('should return a ${camelName} by id', async () => {
      // TODO: Create test ${camelName} first
      const id = '1';
      const result = await service.getById(id);

      expect(result).toBeDefined();
      expect(result.id).toBe(id);
    });

    it('should return null for non-existent id', async () => {
      const result = await service.getById('999999');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new ${camelName}', async () => {
      const data = {
        // TODO: Add required fields
      };

      const result = await service.create(data);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should throw error for invalid data', async () => {
      await expect(service.create({} as any)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a ${camelName}', async () => {
      // TODO: Create test ${camelName} first
      const id = '1';
      const updates = {
        // TODO: Add fields to update
      };

      const result = await service.update(id, updates);

      expect(result).toBeDefined();
      expect(result.id).toBe(id);
    });

    it('should return null for non-existent id', async () => {
      const result = await service.update('999999', {});

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a ${camelName}', async () => {
      // TODO: Create test ${camelName} first
      const id = '1';
      const result = await service.delete(id);

      expect(result).toBe(true);
    });

    it('should return false for non-existent id', async () => {
      const result = await service.delete('999999');

      expect(result).toBe(false);
    });
  });
});
`;
}
