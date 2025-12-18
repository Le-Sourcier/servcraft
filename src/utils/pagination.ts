import type { PaginationParams, PaginatedResult } from '../types/index.js';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function parsePaginationParams(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page || DEFAULT_PAGE), 10));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(query.limit || DEFAULT_LIMIT), 10)));
  const sortBy = typeof query.sortBy === 'string' ? query.sortBy : undefined;
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

  return { page, limit, sortBy, sortOrder };
}

export function createPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / params.limit);

  return {
    data,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPrevPage: params.page > 1,
    },
  };
}

export function getSkip(params: PaginationParams): number {
  return (params.page - 1) * params.limit;
}
