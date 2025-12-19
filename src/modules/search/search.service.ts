import { logger } from '../../core/logger.js';
import { NotFoundError } from '../../utils/errors.js';
import type {
  SearchConfig,
  SearchDocument,
  SearchQuery,
  SearchResult,
  IndexSettings,
  BulkIndexOperation,
  BulkIndexResult,
  IndexStats,
  AutocompleteResult,
  SearchEngine as ISearchEngine,
} from './types.js';
import { MemorySearchAdapter } from './adapters/memory.adapter.js';

/**
 * Search Service
 * Unified interface for Elasticsearch, Meilisearch, or in-memory search
 */
export class SearchService {
  private engine: ISearchEngine;
  private config: SearchConfig;

  constructor(config?: SearchConfig, engine?: ISearchEngine) {
    this.config = config || {};
    this.engine = engine || new MemorySearchAdapter();

    logger.info({ engine: this.config.engine || 'memory' }, 'Search service initialized');
  }

  /**
   * Create a search index
   */
  async createIndex(indexName: string, settings?: IndexSettings): Promise<void> {
    const mergedSettings = {
      ...this.config.defaultSettings,
      ...settings,
    };

    await this.engine.createIndex(indexName, mergedSettings);

    logger.info({ indexName, settings: mergedSettings }, 'Search index created');
  }

  /**
   * Delete a search index
   */
  async deleteIndex(indexName: string): Promise<void> {
    await this.engine.deleteIndex(indexName);

    logger.info({ indexName }, 'Search index deleted');
  }

  /**
   * Index a single document
   */
  async indexDocument(indexName: string, id: string, document: SearchDocument): Promise<void> {
    await this.engine.index(indexName, id, document);

    logger.debug({ indexName, documentId: id }, 'Document indexed');
  }

  /**
   * Index multiple documents
   */
  async indexDocuments(indexName: string, documents: SearchDocument[]): Promise<BulkIndexResult> {
    const operations: BulkIndexOperation[] = documents.map((doc) => ({
      operation: 'index',
      id: doc.id,
      document: doc,
    }));

    const result = await this.engine.bulkIndex(indexName, operations);

    logger.info(
      { indexName, success: result.success, failed: result.failed },
      'Bulk index completed'
    );

    return result;
  }

  /**
   * Search documents
   */
  async search<T = SearchDocument>(
    indexName: string,
    query: SearchQuery
  ): Promise<SearchResult<T>> {
    const startTime = Date.now();

    const result = await this.engine.search<T>(indexName, query);

    const duration = Date.now() - startTime;

    logger.debug(
      {
        indexName,
        query: query.query,
        hits: result.hits.length,
        total: result.total,
        duration,
      },
      'Search completed'
    );

    return result;
  }

  /**
   * Delete a document
   */
  async deleteDocument(indexName: string, id: string): Promise<void> {
    await this.engine.delete(indexName, id);

    logger.debug({ indexName, documentId: id }, 'Document deleted');
  }

  /**
   * Update a document
   */
  async updateDocument(
    indexName: string,
    id: string,
    document: Partial<SearchDocument>
  ): Promise<void> {
    await this.engine.update(indexName, id, document);

    logger.debug({ indexName, documentId: id }, 'Document updated');
  }

  /**
   * Get document by ID
   */
  async getDocument(indexName: string, id: string): Promise<SearchDocument> {
    const doc = await this.engine.get(indexName, id);

    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    return doc;
  }

  /**
   * Update index settings
   */
  async updateSettings(indexName: string, settings: IndexSettings): Promise<void> {
    await this.engine.updateSettings(indexName, settings);

    logger.info({ indexName, settings }, 'Index settings updated');
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<IndexStats> {
    return await this.engine.getStats(indexName);
  }

  /**
   * Autocomplete suggestions
   */
  async autocomplete(indexName: string, query: string, limit = 10): Promise<AutocompleteResult> {
    return await this.engine.autocomplete(indexName, query, limit);
  }

  /**
   * Full-text search with facets
   */
  async searchWithFacets<T = SearchDocument>(
    indexName: string,
    query: string,
    options?: {
      filters?: SearchQuery['filters'];
      facets?: string[];
      limit?: number;
    }
  ): Promise<SearchResult<T>> {
    return await this.search<T>(indexName, {
      query,
      filters: options?.filters,
      facets: options?.facets,
      limit: options?.limit || 20,
    });
  }

  /**
   * Search similar documents
   */
  async searchSimilar<T = SearchDocument>(
    indexName: string,
    documentId: string,
    limit = 10
  ): Promise<SearchResult<T>> {
    // Get the document
    const doc = await this.getDocument(indexName, documentId);

    // Use its content for similarity search
    const searchTerms = Object.values(doc)
      .filter((v) => typeof v === 'string')
      .join(' ')
      .substring(0, 200);

    return await this.search<T>(indexName, {
      query: searchTerms,
      limit,
    });
  }

  /**
   * Reindex documents from one index to another
   */
  async reindex(
    sourceIndex: string,
    targetIndex: string,
    transform?: (doc: SearchDocument) => SearchDocument
  ): Promise<BulkIndexResult> {
    // Get all documents from source
    const result = await this.search(sourceIndex, {
      query: '*',
      limit: 10000,
    });

    // Transform if needed
    const documents = transform
      ? result.hits.map((hit) => transform(hit.document as SearchDocument))
      : result.hits.map((hit) => hit.document as SearchDocument);

    // Index to target
    return await this.indexDocuments(targetIndex, documents);
  }
}
