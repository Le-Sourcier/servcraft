import { describe, it, expect } from 'vitest';
import {
  parsePaginationParams,
  createPaginatedResult,
  getSkip,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '../../../src/utils/pagination.js';

describe('Pagination Utils', () => {
  describe('parsePaginationParams', () => {
    it('should return default values when no params provided', () => {
      const result = parsePaginationParams({});
      expect(result.page).toBe(DEFAULT_PAGE);
      expect(result.limit).toBe(DEFAULT_LIMIT);
      expect(result.sortOrder).toBe('asc');
    });

    it('should parse page and limit from query', () => {
      const result = parsePaginationParams({ page: '3', limit: '50' });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });

    it('should enforce minimum page of 1', () => {
      const result = parsePaginationParams({ page: '-1' });
      expect(result.page).toBe(1);
    });

    it('should enforce maximum limit', () => {
      const result = parsePaginationParams({ limit: '500' });
      expect(result.limit).toBe(MAX_LIMIT);
    });

    it('should parse sortBy and sortOrder', () => {
      const result = parsePaginationParams({ sortBy: 'name', sortOrder: 'desc' });
      expect(result.sortBy).toBe('name');
      expect(result.sortOrder).toBe('desc');
    });
  });

  describe('createPaginatedResult', () => {
    it('should create correct metadata', () => {
      const data = [1, 2, 3];
      const result = createPaginatedResult(data, 10, { page: 1, limit: 3 });

      expect(result.data).toEqual(data);
      expect(result.meta.total).toBe(10);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(3);
      expect(result.meta.totalPages).toBe(4);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(false);
    });

    it('should handle last page correctly', () => {
      const result = createPaginatedResult([1], 10, { page: 4, limit: 3 });

      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPrevPage).toBe(true);
    });

    it('should handle empty results', () => {
      const result = createPaginatedResult([], 0, { page: 1, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPrevPage).toBe(false);
    });
  });

  describe('getSkip', () => {
    it('should calculate correct skip value', () => {
      expect(getSkip({ page: 1, limit: 10 })).toBe(0);
      expect(getSkip({ page: 2, limit: 10 })).toBe(10);
      expect(getSkip({ page: 3, limit: 20 })).toBe(40);
    });
  });
});
