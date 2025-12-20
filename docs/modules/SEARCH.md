# Search Module

Full-text search with support for multiple backends (Elasticsearch, Meilisearch, in-memory).

## Features

- **Multiple Backends** - Elasticsearch, Meilisearch, or in-memory
- **Full-text Search** - Text search with relevance scoring
- **Faceted Search** - Filter and aggregate results
- **Autocomplete** - Search suggestions
- **Bulk Indexing** - Efficient batch operations
- **Similar Documents** - Find related content

## Usage

### Basic Setup

```typescript
import { SearchService } from 'servcraft/modules/search';

// In-memory search (default)
const searchService = new SearchService();

// With Elasticsearch
const esSearch = new SearchService({
  engine: 'elasticsearch',
  elasticsearch: {
    node: 'http://localhost:9200',
    auth: { username: 'elastic', password: 'password' },
  },
});

// With Meilisearch
const meiliSearch = new SearchService({
  engine: 'meilisearch',
  meilisearch: {
    host: 'http://localhost:7700',
    apiKey: 'masterKey',
  },
});
```

### Index Management

```typescript
// Create index
await searchService.createIndex('products', {
  searchableAttributes: ['name', 'description', 'category'],
  filterableAttributes: ['category', 'price', 'inStock'],
  sortableAttributes: ['price', 'createdAt'],
});

// Delete index
await searchService.deleteIndex('products');

// Update settings
await searchService.updateSettings('products', {
  searchableAttributes: ['name', 'description', 'tags'],
});

// Get statistics
const stats = await searchService.getStats('products');
// { documentCount: 1000, indexSize: '5.2MB', ... }
```

### Indexing Documents

```typescript
// Index single document
await searchService.indexDocument('products', 'prod-123', {
  id: 'prod-123',
  name: 'Wireless Headphones',
  description: 'High-quality wireless headphones with noise cancellation',
  category: 'Electronics',
  price: 99.99,
  inStock: true,
  tags: ['audio', 'wireless', 'headphones'],
});

// Bulk index
const products = [
  { id: '1', name: 'Product 1', ... },
  { id: '2', name: 'Product 2', ... },
];

const result = await searchService.indexDocuments('products', products);
// { success: 2, failed: 0, errors: [] }
```

### Searching

```typescript
// Simple search
const results = await searchService.search('products', {
  query: 'wireless headphones',
  limit: 20,
});
// {
//   hits: [{ document: {...}, score: 0.95 }, ...],
//   total: 45,
//   took: 12
// }

// With filters
const filtered = await searchService.search('products', {
  query: 'headphones',
  filters: {
    category: 'Electronics',
    price: { $lt: 100 },
    inStock: true,
  },
  limit: 10,
  offset: 0,
});

// With facets
const faceted = await searchService.searchWithFacets('products', 'headphones', {
  facets: ['category', 'brand'],
  filters: { inStock: true },
});
// {
//   hits: [...],
//   facets: {
//     category: { Electronics: 25, Audio: 15 },
//     brand: { Sony: 10, Bose: 8 }
//   }
// }
```

### Document Operations

```typescript
// Get document
const doc = await searchService.getDocument('products', 'prod-123');

// Update document
await searchService.updateDocument('products', 'prod-123', {
  price: 89.99,
  inStock: false,
});

// Delete document
await searchService.deleteDocument('products', 'prod-123');
```

### Autocomplete

```typescript
const suggestions = await searchService.autocomplete('products', 'wire', 10);
// {
//   suggestions: ['wireless headphones', 'wireless mouse', 'wireless keyboard'],
//   took: 5
// }
```

### Similar Documents

```typescript
// Find similar products
const similar = await searchService.searchSimilar('products', 'prod-123', 5);
// Returns documents similar to product 'prod-123'
```

### Reindexing

```typescript
// Reindex with transformation
await searchService.reindex(
  'products-v1',
  'products-v2',
  (doc) => ({
    ...doc,
    fullName: `${doc.brand} ${doc.name}`,
    priceRange: doc.price < 50 ? 'budget' : 'premium',
  })
);
```

## Configuration

```typescript
interface SearchConfig {
  engine?: 'memory' | 'elasticsearch' | 'meilisearch';
  defaultSettings?: IndexSettings;
  elasticsearch?: {
    node: string;
    auth?: { username: string; password: string };
  };
  meilisearch?: {
    host: string;
    apiKey: string;
  };
}

interface IndexSettings {
  searchableAttributes?: string[];
  filterableAttributes?: string[];
  sortableAttributes?: string[];
  distinctAttribute?: string;
}

interface SearchQuery {
  query: string;
  filters?: Record<string, unknown>;
  facets?: string[];
  limit?: number;
  offset?: number;
  sort?: string[];
}
```

## Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `$eq` | Equal | `{ status: { $eq: 'active' } }` |
| `$ne` | Not equal | `{ status: { $ne: 'deleted' } }` |
| `$gt` | Greater than | `{ price: { $gt: 50 } }` |
| `$gte` | Greater or equal | `{ rating: { $gte: 4 } }` |
| `$lt` | Less than | `{ price: { $lt: 100 } }` |
| `$lte` | Less or equal | `{ stock: { $lte: 10 } }` |
| `$in` | In array | `{ category: { $in: ['A', 'B'] } }` |
| `$nin` | Not in array | `{ status: { $nin: ['deleted'] } }` |

## Fastify Integration

```typescript
// Search endpoint
fastify.get('/api/search', async (request, reply) => {
  const { q, category, page = 1, limit = 20 } = request.query;

  const results = await searchService.search('products', {
    query: q,
    filters: category ? { category } : undefined,
    limit,
    offset: (page - 1) * limit,
  });

  return {
    success: true,
    data: results.hits.map(h => h.document),
    total: results.total,
    page,
    totalPages: Math.ceil(results.total / limit),
  };
});

// Autocomplete endpoint
fastify.get('/api/search/suggest', async (request, reply) => {
  const { q } = request.query;

  const suggestions = await searchService.autocomplete('products', q, 5);
  return { suggestions: suggestions.suggestions };
});
```

## Indexing Strategy

```typescript
// When to index
userService.on('user:created', async (user) => {
  await searchService.indexDocument('users', user.id, {
    id: user.id,
    name: user.name,
    email: user.email,
  });
});

userService.on('user:updated', async (user) => {
  await searchService.updateDocument('users', user.id, {
    name: user.name,
    email: user.email,
  });
});

userService.on('user:deleted', async (userId) => {
  await searchService.deleteDocument('users', userId);
});
```

## Best Practices

1. **Index Design** - Only index searchable/filterable fields
2. **Bulk Operations** - Use bulk indexing for large datasets
3. **Pagination** - Always paginate search results
4. **Relevance Tuning** - Configure searchable attributes by importance
5. **Sync Strategy** - Keep search index in sync with database
6. **Monitoring** - Track search latency and index size
