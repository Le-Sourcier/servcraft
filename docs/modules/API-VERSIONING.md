# API Versioning Module

API versioning support with multiple detection strategies.

## Features

- **Multiple Strategies** - URL path, header, query param, Accept header
- **Version Detection** - Automatic version detection from requests
- **Deprecation Warnings** - Warn clients about deprecated versions
- **Migration Support** - Data migration between versions
- **Sunset Dates** - Track version end-of-life dates

## Strategies

| Strategy | Example | Best For |
|----------|---------|----------|
| URL Path | `/v1/users`, `/v2/users` | RESTful APIs, clear versioning |
| Header | `X-API-Version: v2` | Clean URLs, flexible |
| Query | `?version=v2` | Simple implementation |
| Accept Header | `Accept: application/vnd.api.v2+json` | Content negotiation |

## Usage

### Configuration

```typescript
import { VersioningService } from 'servcraft/modules/api-versioning';

const versionService = new VersioningService({
  strategy: 'url',
  defaultVersion: 'v1',
  versions: [
    {
      version: 'v1',
      status: 'deprecated',
      releasedAt: new Date('2023-01-01'),
      sunsetAt: new Date('2024-06-01'),
    },
    {
      version: 'v2',
      status: 'active',
      releasedAt: new Date('2024-01-01'),
    },
    {
      version: 'v3',
      status: 'active',
      releasedAt: new Date('2024-06-01'),
    },
  ],
  headerName: 'X-API-Version',
  queryParam: 'version',
  strict: true,
  deprecationWarnings: true,
});
```

### Version Detection

```typescript
// Detect version from request
const result = versionService.detectVersion({
  url: '/v2/users',
  headers: { 'x-api-version': 'v2' },
  query: { version: 'v2' },
});
// {
//   version: 'v2',
//   source: 'url',
//   isValid: true,
//   warning: undefined
// }

// Deprecated version warning
const deprecatedResult = versionService.detectVersion({
  url: '/v1/users',
});
// {
//   version: 'v1',
//   source: 'url',
//   isValid: true,
//   warning: 'API version v1 is deprecated and will be removed on 2024-06-01'
// }
```

### Version Information

```typescript
// Get version info
const info = versionService.getVersion('v2');
// { version: 'v2', status: 'active', releasedAt: Date }

// Get all versions
const all = versionService.getAllVersions();

// Get active versions
const active = versionService.getActiveVersions();

// Check if version is valid
const isValid = versionService.isVersionValid('v3');

// Compare versions
const comparison = versionService.compareVersions('v1', 'v2');
// Returns: -1 (v1 < v2)
```

### Migrations

```typescript
// Add migration
versionService.addMigration({
  from: 'v1',
  to: 'v2',
  transform: (data) => ({
    ...data,
    // v2 renames 'name' to 'fullName'
    fullName: data.name,
    name: undefined,
    // v2 adds required field
    version: 2,
  }),
});

// Get migration
const migration = versionService.getMigration('v1', 'v2');
if (migration) {
  const v2Data = migration.transform(v1Data);
}
```

## Configuration Types

```typescript
interface VersioningConfig {
  strategy: 'url' | 'header' | 'query' | 'accept-header';
  defaultVersion: string;
  versions: ApiVersion[];
  headerName?: string;      // default: 'X-API-Version'
  queryParam?: string;      // default: 'version'
  strict?: boolean;         // Reject invalid versions
  deprecationWarnings?: boolean;
}

interface ApiVersion {
  version: string;
  status: 'active' | 'deprecated' | 'sunset';
  releasedAt: Date;
  sunsetAt?: Date;
  changelog?: string;
}

interface VersionMigration {
  from: string;
  to: string;
  transform: (data: unknown) => unknown;
}
```

## Fastify Integration

```typescript
import { versioningMiddleware } from 'servcraft/modules/api-versioning';

// Register middleware
fastify.addHook('preHandler', async (request, reply) => {
  const result = versionService.detectVersion({
    url: request.url,
    headers: request.headers,
    query: request.query,
  });

  if (!result.isValid && versionService.config.strict) {
    return reply.status(400).send({
      error: `Invalid API version: ${result.version}`,
      supportedVersions: versionService.getActiveVersions().map(v => v.version),
    });
  }

  request.apiVersion = result.version;

  // Add deprecation warning header
  if (result.warning) {
    reply.header('X-API-Deprecation-Warning', result.warning);
    reply.header('Sunset', versionService.getVersion(result.version)?.sunsetAt?.toISOString());
  }
});
```

### Versioned Routes

```typescript
// URL-based versioning
fastify.get('/v1/users', async (request, reply) => {
  // v1 response format
  return users.map(u => ({ name: u.name, email: u.email }));
});

fastify.get('/v2/users', async (request, reply) => {
  // v2 response format with pagination
  return {
    data: users.map(u => ({ fullName: u.fullName, email: u.email })),
    meta: { total: users.length },
  };
});

// Header-based versioning (single route)
fastify.get('/users', async (request, reply) => {
  const version = request.apiVersion;

  if (version === 'v1') {
    return users.map(u => ({ name: u.name }));
  }

  // v2 and later
  return {
    data: users.map(u => ({ fullName: u.fullName })),
    meta: { total: users.length },
  };
});
```

## Response Headers

```http
# Deprecation warning
X-API-Deprecation-Warning: API version v1 is deprecated and will be removed on 2024-06-01
Sunset: 2024-06-01T00:00:00.000Z

# Current version
X-API-Version: v2
```

## Version Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Version Lifecycle                        │
├─────────────────────────────────────────────────────────────┤
│  ACTIVE ──────► DEPRECATED ──────► SUNSET ──────► REMOVED   │
│                     │                  │                    │
│                  Warning            Error                   │
│                  Headers           Response                 │
└─────────────────────────────────────────────────────────────┘
```

## Best Practices

1. **Semantic Versioning** - Use v1, v2, v3 for major breaking changes
2. **Deprecation Period** - Give clients 6+ months notice
3. **Sunset Headers** - Include Sunset header for deprecated versions
4. **Documentation** - Document changes between versions
5. **Default Version** - Don't change default version without notice
6. **Migration Guides** - Provide clear migration instructions
