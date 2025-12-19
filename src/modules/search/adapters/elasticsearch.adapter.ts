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

interface ElasticsearchClient {
  index: (params: unknown) => Promise<unknown>;
  bulk: (params: unknown) => Promise<unknown>;
  search: (params: unknown) => Promise<unknown>;
  delete: (params: unknown) => Promise<unknown>;
  update: (params: unknown) => Promise<unknown>;
  get: (params: unknown) => Promise<unknown>;
  indices: {
    create: (params: unknown) => Promise<unknown>;
    delete: (params: unknown) => Promise<unknown>;
    putSettings: (params: unknown) => Promise<unknown>;
    stats: (params: unknown) => Promise<unknown>;
  };
}

/**
 * Elasticsearch Adapter
 * Production-ready search with Elasticsearch
 */
export class ElasticsearchAdapter implements SearchEngine {
  private client: ElasticsearchClient;

  constructor(client: ElasticsearchClient) {
    this.client = client;
  }

  async createIndex(indexName: string, settings?: IndexSettings): Promise<void> {
    const mappings: Record<string, unknown> = {};

    if (settings?.searchableAttributes || settings?.filterableAttributes) {
      mappings.properties = {};

      (settings.searchableAttributes || []).forEach((attr) => {
        (mappings.properties as Record<string, unknown>)[attr] = { type: 'text' };
      });

      (settings.filterableAttributes || []).forEach((attr) => {
        (mappings.properties as Record<string, unknown>)[attr] = { type: 'keyword' };
      });
    }

    await this.client.indices.create({
      index: indexName,
      body: {
        settings: {
          number_of_shards: settings?.numberOfShards || 1,
          number_of_replicas: settings?.numberOfReplicas || 1,
        },
        mappings,
      },
    });
  }

  async deleteIndex(indexName: string): Promise<void> {
    await this.client.indices.delete({ index: indexName });
  }

  async index(indexName: string, id: string, document: SearchDocument): Promise<void> {
    await this.client.index({
      index: indexName,
      id,
      body: document,
    });
  }

  async bulkIndex(indexName: string, operations: BulkIndexOperation[]): Promise<BulkIndexResult> {
    const startTime = Date.now();
    const body: unknown[] = [];

    for (const op of operations) {
      if (op.operation === 'index') {
        body.push({ index: { _index: indexName, _id: op.id } });
        body.push(op.document);
      } else if (op.operation === 'update') {
        body.push({ update: { _index: indexName, _id: op.id } });
        body.push({ doc: op.document });
      } else if (op.operation === 'delete') {
        body.push({ delete: { _index: indexName, _id: op.id } });
      }
    }

    const result = (await this.client.bulk({ body })) as {
      items: Array<Record<string, { error?: unknown }>>;
    };

    let success = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    result.items.forEach((item, idx) => {
      const operation = Object.values(item)[0];
      if (operation.error) {
        failed++;
        errors.push({
          id: operations[idx].id,
          error: JSON.stringify(operation.error),
        });
      } else {
        success++;
      }
    });

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
    const body: Record<string, unknown> = {
      query: {
        multi_match: {
          query: query.query,
          fields: query.fields || ['*'],
          fuzziness: query.fuzziness || 'AUTO',
        },
      },
      from: query.offset || 0,
      size: query.limit || 20,
    };

    if (query.sort) {
      body.sort = query.sort.map((s) => ({
        [s.field]: { order: s.direction },
      }));
    }

    if (query.filters) {
      const must: unknown[] = [];

      for (const filter of query.filters) {
        switch (filter.operator) {
          case 'eq':
            must.push({ term: { [filter.field]: filter.value } });
            break;
          case 'in':
            must.push({ terms: { [filter.field]: filter.value } });
            break;
          case 'exists':
            must.push({ exists: { field: filter.field } });
            break;
          case 'gt':
          case 'gte':
          case 'lt':
          case 'lte':
            must.push({
              range: { [filter.field]: { [filter.operator]: filter.value } },
            });
            break;
        }
      }

      body.query = {
        bool: {
          must: [body.query, ...must],
        },
      };
    }

    if (query.highlight) {
      body.highlight = {
        fields: query.fields ? Object.fromEntries(query.fields.map((f) => [f, {}])) : { '*': {} },
      };
    }

    const result = (await this.client.search({
      index: indexName,
      body,
    })) as {
      hits: {
        total: { value: number };
        hits: Array<{
          _source: T;
          _score: number;
          highlight?: Record<string, string[]>;
        }>;
      };
      took: number;
    };

    const hits = result.hits.hits.map((hit) => ({
      document: hit._source,
      score: hit._score,
      highlights: hit.highlight,
    }));

    return {
      hits,
      total: result.hits.total.value,
      processingTime: result.took,
      page: Math.floor((query.offset || 0) / (query.limit || 20)) + 1,
      totalPages: Math.ceil(result.hits.total.value / (query.limit || 20)),
    };
  }

  async delete(indexName: string, id: string): Promise<void> {
    await this.client.delete({
      index: indexName,
      id,
    });
  }

  async update(indexName: string, id: string, document: Partial<SearchDocument>): Promise<void> {
    await this.client.update({
      index: indexName,
      id,
      body: {
        doc: document,
      },
    });
  }

  async get(indexName: string, id: string): Promise<SearchDocument | null> {
    try {
      const result = (await this.client.get({
        index: indexName,
        id,
      })) as { _source: SearchDocument };

      return result._source;
    } catch {
      return null;
    }
  }

  async updateSettings(indexName: string, settings: IndexSettings): Promise<void> {
    const esSettings: Record<string, unknown> = {};

    if (settings.stopWords) {
      esSettings.analysis = {
        filter: {
          custom_stop: {
            type: 'stop',
            stopwords: settings.stopWords,
          },
        },
      };
    }

    await this.client.indices.putSettings({
      index: indexName,
      body: esSettings,
    });
  }

  async getStats(indexName: string): Promise<IndexStats> {
    const stats = (await this.client.indices.stats({
      index: indexName,
    })) as {
      indices: Record<
        string,
        {
          total: {
            docs: { count: number };
            store: { size_in_bytes: number };
          };
        }
      >;
    };

    const indexStats = stats.indices[indexName];

    return {
      name: indexName,
      documentCount: indexStats.total.docs.count,
      size: indexStats.total.store.size_in_bytes,
      isIndexing: false,
      health: 'green',
    };
  }

  async autocomplete(indexName: string, query: string, limit = 10): Promise<AutocompleteResult> {
    const startTime = Date.now();

    const result = (await this.client.search({
      index: indexName,
      body: {
        suggest: {
          autocomplete: {
            prefix: query,
            completion: {
              field: 'suggest',
              size: limit,
            },
          },
        },
      },
    })) as {
      suggest: {
        autocomplete: Array<{
          options: Array<{ text: string; _source: SearchDocument }>;
        }>;
      };
    };

    const suggestions = result.suggest.autocomplete[0]?.options.map((opt) => opt.text) || [];
    const documents = result.suggest.autocomplete[0]?.options.map((opt) => opt._source) || [];

    return {
      suggestions,
      documents,
      processingTime: Date.now() - startTime,
    };
  }
}
