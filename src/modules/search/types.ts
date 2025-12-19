export type SearchEngine = 'elasticsearch' | 'meilisearch' | 'memory';

export interface SearchConfig {
  /** Search engine to use */
  engine?: SearchEngine;
  /** Elasticsearch config */
  elasticsearch?: {
    node: string;
    auth?: {
      username: string;
      password: string;
    };
    apiKey?: string;
  };
  /** Meilisearch config */
  meilisearch?: {
    host: string;
    apiKey?: string;
  };
  /** Default index settings */
  defaultSettings?: IndexSettings;
}

export interface IndexSettings {
  /** Searchable attributes */
  searchableAttributes?: string[];
  /** Attributes to display in results */
  displayedAttributes?: string[];
  /** Filterable attributes */
  filterableAttributes?: string[];
  /** Sortable attributes */
  sortableAttributes?: string[];
  /** Ranking rules */
  rankingRules?: string[];
  /** Stop words */
  stopWords?: string[];
  /** Synonyms */
  synonyms?: Record<string, string[]>;
  /** Number of replicas */
  numberOfReplicas?: number;
  /** Number of shards */
  numberOfShards?: number;
}

export interface SearchDocument {
  /** Document unique ID */
  id: string;
  /** Document data */
  [key: string]: unknown;
}

export interface SearchQuery {
  /** Search query string */
  query: string;
  /** Filters to apply */
  filters?: SearchFilter[];
  /** Fields to search in */
  fields?: string[];
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort options */
  sort?: SearchSort[];
  /** Facets to compute */
  facets?: string[];
  /** Highlight matches */
  highlight?: boolean;
  /** Fuzzy search threshold (0-1) */
  fuzziness?: number;
}

export interface SearchFilter {
  /** Field to filter on */
  field: string;
  /** Filter operator */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'exists';
  /** Filter value */
  value: unknown;
}

export interface SearchSort {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: 'asc' | 'desc';
}

export interface SearchResult<T = SearchDocument> {
  /** Matched documents */
  hits: SearchHit<T>[];
  /** Total number of matches */
  total: number;
  /** Query processing time (ms) */
  processingTime: number;
  /** Current page */
  page?: number;
  /** Total pages */
  totalPages?: number;
  /** Facet results */
  facets?: Record<string, FacetResult>;
}

export interface SearchHit<T = SearchDocument> {
  /** Document */
  document: T;
  /** Relevance score */
  score?: number;
  /** Highlighted fields */
  highlights?: Record<string, string[]>;
  /** Matched terms */
  matchedTerms?: string[];
}

export interface FacetResult {
  /** Facet values and counts */
  values: Array<{
    value: string;
    count: number;
  }>;
  /** Total unique values */
  total: number;
}

export interface AutocompleteResult {
  /** Suggestions */
  suggestions: string[];
  /** Documents matching suggestions */
  documents?: SearchDocument[];
  /** Processing time (ms) */
  processingTime: number;
}

export interface IndexStats {
  /** Index name */
  name: string;
  /** Total documents */
  documentCount: number;
  /** Index size in bytes */
  size: number;
  /** Is indexing in progress */
  isIndexing: boolean;
  /** Last update timestamp */
  lastUpdate?: Date;
  /** Health status */
  health?: 'green' | 'yellow' | 'red';
}

export interface BulkIndexOperation {
  /** Operation type */
  operation: 'index' | 'update' | 'delete';
  /** Document ID */
  id: string;
  /** Document data (for index/update) */
  document?: SearchDocument;
}

export interface BulkIndexResult {
  /** Successful operations */
  success: number;
  /** Failed operations */
  failed: number;
  /** Error details */
  errors?: Array<{
    id: string;
    error: string;
  }>;
  /** Processing time (ms) */
  processingTime: number;
}

export interface SearchSuggestion {
  /** Suggestion text */
  text: string;
  /** Score/relevance */
  score: number;
  /** Highlighted version */
  highlighted?: string;
}

export interface SearchEngine {
  /** Index a document */
  index(indexName: string, id: string, document: SearchDocument): Promise<void>;

  /** Bulk index documents */
  bulkIndex(indexName: string, operations: BulkIndexOperation[]): Promise<BulkIndexResult>;

  /** Search documents */
  search<T = SearchDocument>(indexName: string, query: SearchQuery): Promise<SearchResult<T>>;

  /** Delete document */
  delete(indexName: string, id: string): Promise<void>;

  /** Update document */
  update(indexName: string, id: string, document: Partial<SearchDocument>): Promise<void>;

  /** Get document by ID */
  get(indexName: string, id: string): Promise<SearchDocument | null>;

  /** Create index */
  createIndex(indexName: string, settings?: IndexSettings): Promise<void>;

  /** Delete index */
  deleteIndex(indexName: string): Promise<void>;

  /** Update index settings */
  updateSettings(indexName: string, settings: IndexSettings): Promise<void>;

  /** Get index stats */
  getStats(indexName: string): Promise<IndexStats>;

  /** Autocomplete */
  autocomplete(indexName: string, query: string, limit?: number): Promise<AutocompleteResult>;
}
