import type { FastifyRequest, FastifyReply } from 'fastify';

// Base entity with common fields
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// Service Result
export type ServiceResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E; message: string };

// Repository interface
export interface Repository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  findMany(params?: PaginationParams): Promise<PaginatedResult<T>>;
  create(data: Omit<T, keyof BaseEntity>): Promise<T>;
  update(id: string, data: Partial<Omit<T, keyof BaseEntity>>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

// Controller handler type
export type ControllerHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

// Module interface
export interface Module {
  name: string;
  register(app: FastifyInstance): Promise<void>;
}

import type { FastifyInstance } from 'fastify';
