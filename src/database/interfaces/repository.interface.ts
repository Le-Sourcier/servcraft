/**
 * Common Repository Interface
 * All repositories must implement this pattern regardless of ORM
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Base repository interface that all entity repositories must implement
 */
export interface IRepository<T> {
  /**
   * Find entity by ID
   * @param id - Entity ID
   * @returns Entity or null if not found
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find many entities with optional filtering and pagination
   * @param filter - Filter criteria (ORM-specific)
   * @param options - Pagination options
   * @returns Paginated results
   */
  findMany(
    filter?: Record<string, unknown>,
    options?: PaginationOptions
  ): Promise<PaginatedResult<T>>;

  /**
   * Find one entity matching filter
   * @param filter - Filter criteria
   * @returns First matching entity or null
   */
  findOne(filter: Record<string, unknown>): Promise<T | null>;

  /**
   * Create new entity
   * @param data - Entity data
   * @returns Created entity
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Update entity by ID
   * @param id - Entity ID
   * @param data - Update data
   * @returns Updated entity or null if not found
   */
  update(id: string, data: Partial<T>): Promise<T | null>;

  /**
   * Delete entity by ID
   * @param id - Entity ID
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Count entities matching filter
   * @param filter - Filter criteria
   * @returns Number of matching entities
   */
  count(filter?: Record<string, unknown>): Promise<number>;

  /**
   * Check if entity exists
   * @param id - Entity ID
   * @returns true if exists
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Transaction interface for atomic operations
 */
export interface ITransaction {
  /**
   * Commit the transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback the transaction
   */
  rollback(): Promise<void>;

  /**
   * Execute operation within transaction
   * @param operation - Async operation to execute
   * @returns Operation result
   */
  execute<R>(operation: () => Promise<R>): Promise<R>;
}

/**
 * Transaction manager interface
 */
export interface ITransactionManager {
  /**
   * Begin a new transaction
   * @returns Transaction instance
   */
  begin(): Promise<ITransaction>;

  /**
   * Execute operations in a transaction (auto commit/rollback)
   * @param callback - Operations to execute
   * @returns Callback result
   */
  transaction<R>(callback: (tx: ITransaction) => Promise<R>): Promise<R>;
}
