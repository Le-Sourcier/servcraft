export { SearchService } from './search.service.js';
export { MemorySearchAdapter } from './adapters/memory.adapter.js';
export { ElasticsearchAdapter } from './adapters/elasticsearch.adapter.js';
export { MeilisearchAdapter } from './adapters/meilisearch.adapter.js';
export type {
  SearchConfig,
  SearchDocument,
  SearchQuery,
  SearchResult,
  SearchHit,
  SearchFilter,
  SearchSort,
  IndexSettings,
  BulkIndexOperation,
  BulkIndexResult,
  IndexStats,
  AutocompleteResult,
  FacetResult,
  SearchSuggestion,
  SearchEngine,
} from './types.js';
