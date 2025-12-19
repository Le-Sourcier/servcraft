import type {
  SearchEngine,
  SearchDocument,
  SearchQuery,
  SearchResult,
  IndexSettings,
  BulkIndexOperation,
  BulkIndexResult,
  IndexStats,
  AutocompleteResult,
} from '../types.js';

interface IndexData {
  documents: Map<string, SearchDocument>;
  settings: IndexSettings;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * In-Memory Search Adapter
 * For development and testing
 */
export class MemorySearchAdapter implements SearchEngine {
  private indexes = new Map<string, IndexData>();

  async createIndex(indexName: string, settings?: IndexSettings): Promise<void> {
    this.indexes.set(indexName, {
      documents: new Map(),
      settings: settings || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async deleteIndex(indexName: string): Promise<void> {
    this.indexes.delete(indexName);
  }

  async index(indexName: string, id: string, document: SearchDocument): Promise<void> {
    if (!this.indexes.has(indexName)) {
      await this.createIndex(indexName);
    }

    const index = this.indexes.get(indexName)!;
    index.documents.set(id, { ...document, id });
    index.updatedAt = new Date();
  }

  async bulkIndex(indexName: string, operations: BulkIndexOperation[]): Promise<BulkIndexResult> {
    const startTime = Date.now();
    let success = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const op of operations) {
      try {
        if (op.operation === 'index' || op.operation === 'update') {
          if (op.document) {
            await this.index(indexName, op.id, op.document);
            success++;
          }
        } else if (op.operation === 'delete') {
          await this.delete(indexName, op.id);
          success++;
        }
      } catch (error) {
        failed++;
        errors.push({
          id: op.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      processingTime: Date.now() - startTime,
    };
  }

  async search<T = SearchDocument>(
    indexName: string,
    query: SearchQuery
  ): Promise<SearchResult<T>> {
    const startTime = Date.now();
    const index = this.indexes.get(indexName);

    if (!index) {
      return {
        hits: [],
        total: 0,
        processingTime: Date.now() - startTime,
      };
    }

    let documents = Array.from(index.documents.values());

    // Simple text search
    if (query.query) {
      const searchTerms = query.query.toLowerCase().split(' ');
      documents = documents.filter((doc) => {
        const searchableFields = query.fields || index.settings.searchableAttributes || [];
        const allFields = searchableFields.length > 0 ? searchableFields : Object.keys(doc);

        return allFields.some((field) => {
          const value = String(doc[field] || '').toLowerCase();
          return searchTerms.some((term) => value.includes(term));
        });
      });
    }

    // Apply filters
    if (query.filters) {
      for (const filter of query.filters) {
        documents = documents.filter((doc) => {
          const value = doc[filter.field];

          switch (filter.operator) {
            case 'eq':
              return value === filter.value;
            case 'ne':
              return value !== filter.value;
            case 'gt':
              return Number(value) > Number(filter.value);
            case 'gte':
              return Number(value) >= Number(filter.value);
            case 'lt':
              return Number(value) < Number(filter.value);
            case 'lte':
              return Number(value) <= Number(filter.value);
            case 'in':
              return Array.isArray(filter.value) && filter.value.includes(value);
            case 'contains':
              return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
            case 'exists':
              return value !== undefined && value !== null;
            default:
              return true;
          }
        });
      }
    }

    // Apply sorting
    if (query.sort && query.sort.length > 0) {
      documents.sort((a, b) => {
        for (const sort of query.sort!) {
          const aVal = a[sort.field];
          const bVal = b[sort.field];

          if (aVal === bVal) continue;

          const comparison = aVal > bVal ? 1 : -1;
          return sort.direction === 'asc' ? comparison : -comparison;
        }
        return 0;
      });
    }

    const total = documents.length;

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    const paginatedDocs = documents.slice(offset, offset + limit);

    // Build hits
    const hits = paginatedDocs.map((doc) => ({
      document: doc as T,
      score: 1.0,
    }));

    return {
      hits,
      total,
      processingTime: Date.now() - startTime,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  async delete(indexName: string, id: string): Promise<void> {
    const index = this.indexes.get(indexName);
    if (index) {
      index.documents.delete(id);
      index.updatedAt = new Date();
    }
  }

  async update(indexName: string, id: string, document: Partial<SearchDocument>): Promise<void> {
    const index = this.indexes.get(indexName);
    if (!index) {
      throw new Error('Index not found');
    }

    const existing = index.documents.get(id);
    if (!existing) {
      throw new Error('Document not found');
    }

    index.documents.set(id, { ...existing, ...document });
    index.updatedAt = new Date();
  }

  async get(indexName: string, id: string): Promise<SearchDocument | null> {
    const index = this.indexes.get(indexName);
    return index?.documents.get(id) || null;
  }

  async updateSettings(indexName: string, settings: IndexSettings): Promise<void> {
    const index = this.indexes.get(indexName);
    if (!index) {
      throw new Error('Index not found');
    }

    index.settings = { ...index.settings, ...settings };
    index.updatedAt = new Date();
  }

  async getStats(indexName: string): Promise<IndexStats> {
    const index = this.indexes.get(indexName);

    if (!index) {
      throw new Error('Index not found');
    }

    const docsSize = JSON.stringify(Array.from(index.documents.values())).length;

    return {
      name: indexName,
      documentCount: index.documents.size,
      size: docsSize,
      isIndexing: false,
      lastUpdate: index.updatedAt,
      health: 'green',
    };
  }

  async autocomplete(indexName: string, query: string, limit = 10): Promise<AutocompleteResult> {
    const startTime = Date.now();
    const index = this.indexes.get(indexName);

    if (!index) {
      return {
        suggestions: [],
        processingTime: Date.now() - startTime,
      };
    }

    const queryLower = query.toLowerCase();
    const suggestions = new Set<string>();

    for (const doc of index.documents.values()) {
      const searchableFields = index.settings.searchableAttributes || Object.keys(doc);

      for (const field of searchableFields) {
        const value = String(doc[field] || '');
        if (value.toLowerCase().includes(queryLower)) {
          suggestions.add(value);
          if (suggestions.size >= limit) break;
        }
      }

      if (suggestions.size >= limit) break;
    }

    return {
      suggestions: Array.from(suggestions).slice(0, limit),
      processingTime: Date.now() - startTime,
    };
  }
}
