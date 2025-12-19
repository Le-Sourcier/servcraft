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

interface MeilisearchClient {
  index: (indexName: string) => MeilisearchIndex;
  getIndex: (indexName: string) => Promise<MeilisearchIndex>;
  createIndex: (indexName: string, options?: { primaryKey?: string }) => Promise<unknown>;
  deleteIndex: (indexName: string) => Promise<void>;
}

interface MeilisearchIndex {
  addDocuments: (documents: unknown[]) => Promise<{ taskUid: number }>;
  updateDocuments: (documents: unknown[]) => Promise<{ taskUid: number }>;
  deleteDocument: (id: string) => Promise<{ taskUid: number }>;
  deleteDocuments: (ids: string[]) => Promise<{ taskUid: number }>;
  getDocument: (id: string) => Promise<unknown>;
  search: (query: string, options?: unknown) => Promise<unknown>;
  updateSettings: (settings: unknown) => Promise<{ taskUid: number }>;
  getSettings: () => Promise<unknown>;
  getStats: () => Promise<unknown>;
}

/**
 * Meilisearch Adapter
 * Production-ready search with Meilisearch
 */
export class MeilisearchAdapter implements SearchEngine {
  private client: MeilisearchClient;

  constructor(client: MeilisearchClient) {
    this.client = client;
  }

  async createIndex(indexName: string, settings?: IndexSettings): Promise<void> {
    await this.client.createIndex(indexName);

    if (settings) {
      await this.updateSettings(indexName, settings);
    }
  }

  async deleteIndex(indexName: string): Promise<void> {
    await this.client.deleteIndex(indexName);
  }

  async index(indexName: string, id: string, document: SearchDocument): Promise<void> {
    const index = this.client.index(indexName);
    await index.addDocuments([{ ...document, id }]);
  }

  async bulkIndex(indexName: string, operations: BulkIndexOperation[]): Promise<BulkIndexResult> {
    const startTime = Date.now();
    const index = this.client.index(indexName);

    const toIndex = operations
      .filter((op) => op.operation === 'index' && op.document)
      .map((op) => ({ ...op.document, id: op.id }));

    const toUpdate = operations
      .filter((op) => op.operation === 'update' && op.document)
      .map((op) => ({ ...op.document, id: op.id }));

    const toDelete = operations.filter((op) => op.operation === 'delete').map((op) => op.id);

    let success = 0;
    let failed = 0;

    try {
      if (toIndex.length > 0) {
        await index.addDocuments(toIndex);
        success += toIndex.length;
      }

      if (toUpdate.length > 0) {
        await index.updateDocuments(toUpdate);
        success += toUpdate.length;
      }

      if (toDelete.length > 0) {
        await index.deleteDocuments(toDelete);
        success += toDelete.length;
      }
    } catch {
      failed = operations.length - success;
    }

    return {
      success,
      failed,
      processingTime: Date.now() - startTime,
    };
  }

  async search<T = SearchDocument>(
    indexName: string,
    query: SearchQuery
  ): Promise<SearchResult<T>> {
    const index = this.client.index(indexName);

    const options: Record<string, unknown> = {
      limit: query.limit || 20,
      offset: query.offset || 0,
    };

    if (query.fields) {
      options.attributesToSearchOn = query.fields;
    }

    if (query.filters) {
      const filterStrings = query.filters.map((f) => {
        switch (f.operator) {
          case 'eq':
            return `${f.field} = ${JSON.stringify(f.value)}`;
          case 'ne':
            return `${f.field} != ${JSON.stringify(f.value)}`;
          case 'gt':
            return `${f.field} > ${f.value}`;
          case 'gte':
            return `${f.field} >= ${f.value}`;
          case 'lt':
            return `${f.field} < ${f.value}`;
          case 'lte':
            return `${f.field} <= ${f.value}`;
          case 'in':
            return `${f.field} IN ${JSON.stringify(f.value)}`;
          case 'exists':
            return `${f.field} EXISTS`;
          default:
            return '';
        }
      });

      options.filter = filterStrings.filter((f) => f).join(' AND ');
    }

    if (query.sort) {
      options.sort = query.sort.map((s) => `${s.field}:${s.direction}`);
    }

    if (query.facets) {
      options.facets = query.facets;
    }

    const result = (await index.search(query.query, options)) as {
      hits: T[];
      estimatedTotalHits: number;
      processingTimeMs: number;
      facetDistribution?: Record<string, Record<string, number>>;
    };

    const hits = result.hits.map((doc) => ({
      document: doc,
      score: 1.0,
    }));

    return {
      hits,
      total: result.estimatedTotalHits,
      processingTime: result.processingTimeMs,
      page: Math.floor((query.offset || 0) / (query.limit || 20)) + 1,
      totalPages: Math.ceil(result.estimatedTotalHits / (query.limit || 20)),
    };
  }

  async delete(indexName: string, id: string): Promise<void> {
    const index = this.client.index(indexName);
    await index.deleteDocument(id);
  }

  async update(indexName: string, id: string, document: Partial<SearchDocument>): Promise<void> {
    const index = this.client.index(indexName);
    await index.updateDocuments([{ ...document, id }]);
  }

  async get(indexName: string, id: string): Promise<SearchDocument | null> {
    try {
      const index = this.client.index(indexName);
      const doc = await index.getDocument(id);
      return doc as SearchDocument;
    } catch {
      return null;
    }
  }

  async updateSettings(indexName: string, settings: IndexSettings): Promise<void> {
    const index = this.client.index(indexName);

    const meilisearchSettings: Record<string, unknown> = {};

    if (settings.searchableAttributes) {
      meilisearchSettings.searchableAttributes = settings.searchableAttributes;
    }

    if (settings.filterableAttributes) {
      meilisearchSettings.filterableAttributes = settings.filterableAttributes;
    }

    if (settings.sortableAttributes) {
      meilisearchSettings.sortableAttributes = settings.sortableAttributes;
    }

    if (settings.displayedAttributes) {
      meilisearchSettings.displayedAttributes = settings.displayedAttributes;
    }

    if (settings.stopWords) {
      meilisearchSettings.stopWords = settings.stopWords;
    }

    if (settings.synonyms) {
      meilisearchSettings.synonyms = settings.synonyms;
    }

    await index.updateSettings(meilisearchSettings);
  }

  async getStats(indexName: string): Promise<IndexStats> {
    const index = this.client.index(indexName);
    const stats = (await index.getStats()) as {
      numberOfDocuments: number;
      isIndexing: boolean;
      fieldDistribution: Record<string, number>;
    };

    return {
      name: indexName,
      documentCount: stats.numberOfDocuments,
      size: 0,
      isIndexing: stats.isIndexing,
      health: 'green',
    };
  }

  async autocomplete(indexName: string, query: string, limit = 10): Promise<AutocompleteResult> {
    const startTime = Date.now();
    const result = await this.search(indexName, {
      query,
      limit,
    });

    const suggestions = result.hits.map((hit) => {
      const doc = hit.document as SearchDocument;
      return String(doc.title || doc.name || doc.id || '');
    });

    return {
      suggestions,
      documents: result.hits.map((h) => h.document as SearchDocument),
      processingTime: Date.now() - startTime,
    };
  }
}
