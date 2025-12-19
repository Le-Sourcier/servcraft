# Multi-ORM Database Support Documentation

## Overview

ServCraft now supports multiple ORMs and databases, giving you complete flexibility in choosing your data persistence layer. This implementation provides a unified interface across all ORMs while preserving their unique capabilities.

## Supported Configurations

### ORM Support

| ORM | Version | Databases Supported | Best For |
|-----|---------|---------------------|----------|
| **Prisma** | Latest | PostgreSQL, MySQL, SQLite, MongoDB | Modern TypeScript projects, strong type safety |
| **Mongoose** | ^8.8.4 | MongoDB | MongoDB-specific features, schema validation |
| **Sequelize** | Coming soon | PostgreSQL, MySQL, SQLite, MariaDB | Legacy SQL projects |
| **TypeORM** | Coming soon | All databases | Decorator-based approach |

### Database Support

| Database | ORMs Available | Default Port | Use Case |
|----------|---------------|--------------|----------|
| **PostgreSQL** | Prisma, Sequelize*, TypeORM* | 5432 | Production SQL, ACID compliance |
| **MySQL** | Prisma, Sequelize*, TypeORM* | 3306 | Popular SQL database |
| **SQLite** | Prisma, Sequelize*, TypeORM* | N/A | Development, embedded |
| **MongoDB** | Mongoose, Prisma, TypeORM* | 27017 | NoSQL, document-oriented |
| **MariaDB** | Sequelize*, TypeORM* | 3306 | MySQL alternative |

*Coming soon

## Quick Start

### Using Prisma (PostgreSQL)

```bash
# Initialize project
npx servcraft init my-app

# Select:
# - Database: PostgreSQL
# - ORM: Auto-selected (Prisma)

# Configure .env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
DATABASE_ORM=prisma
DATABASE_TYPE=postgresql

# Run migrations
npx prisma migrate dev
```

### Using Mongoose (MongoDB)

```bash
# Initialize project
npx servcraft init my-app

# Select:
# - Database: MongoDB
# - ORM: Auto-selected (Mongoose)

# Configure .env
MONGODB_URI="mongodb://localhost:27017/mydb"
DATABASE_ORM=mongoose
DATABASE_TYPE=mongodb

# No migrations needed - Mongoose creates collections automatically
```

## Architecture

### Unified Interface Pattern

```typescript
// All ORMs implement the same interfaces
interface IDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
  getType(): 'prisma' | 'mongoose' | 'sequelize' | 'typeorm';
  getDatabaseType(): 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
}

interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findMany(filter?, options?): Promise<PaginatedResult<T>>;
  findOne(filter): Promise<T | null>;
  create(data): Promise<T>;
  update(id, data): Promise<T | null>;
  delete(id): Promise<boolean>;
  count(filter?): Promise<number>;
  exists(id): Promise<boolean>;
}
```

### Factory Pattern

```typescript
import { DatabaseFactory } from './database/connection.js';

// Initialize with config
const adapter = await DatabaseFactory.initialize({
  orm: 'prisma',
  database: 'postgresql',
  url: process.env.DATABASE_URL,
});

// Or get current adapter
const adapter = DatabaseFactory.getAdapter();

// Health check
const isHealthy = await DatabaseFactory.healthCheck();
```

## Usage Examples

### Prisma Adapter

```typescript
import { DatabaseFactory } from './database/connection.js';
import { PrismaAdapter } from './database/adapters/prisma.adapter.js';

// Initialize
const adapter = await DatabaseFactory.initialize({
  orm: 'prisma',
  database: 'postgresql',
  url: 'postgresql://localhost:5432/mydb',
});

// Get Prisma client
const prismaAdapter = adapter as PrismaAdapter;
const prisma = prismaAdapter.getClient();

// Use Prisma directly
const users = await prisma.user.findMany();
```

### Mongoose Adapter

```typescript
import { DatabaseFactory } from './database/connection.js';
import { MongooseAdapter } from './database/adapters/mongoose.adapter.js';

// Initialize
const adapter = await DatabaseFactory.initialize({
  orm: 'mongoose',
  database: 'mongodb',
  url: 'mongodb://localhost:27017/mydb',
});

// Get Mongoose instance
const mongooseAdapter = adapter as MongooseAdapter;
const mongoose = mongooseAdapter.getMongoose();

// Use Mongoose models
import { UserModel } from './database/models/mongoose/user.schema.js';
const user = await UserModel.findOne({ email: 'test@example.com' });
```

### Using Repositories (ORM-Agnostic)

```typescript
// Works with ANY ORM!
import { MongooseUserRepository } from './database/repositories/mongoose/user.repository.js';
// or
import { UserRepository } from './modules/user/user.repository.js'; // Prisma

const userRepo = new MongooseUserRepository();

// Standard interface - works the same regardless of ORM
const user = await userRepo.create({
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe',
});

const found = await userRepo.findById(user.id);
const all = await userRepo.findMany({}, { page: 1, limit: 10 });
```

## Environment Variables

### Universal Variables

```bash
# Required
DATABASE_ORM=prisma           # or mongoose, sequelize, typeorm
DATABASE_TYPE=postgresql      # or mysql, sqlite, mongodb, mariadb

# Optional
DATABASE_LOGGING=false
DATABASE_SSL=false
```

### Prisma (SQL Databases)

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
# or
DATABASE_URL="mysql://user:password@localhost:3306/mydb"
# or
DATABASE_URL="file:./dev.db"  # SQLite
```

### Mongoose (MongoDB)

```bash
MONGODB_URI="mongodb://localhost:27017/mydb"
# or with auth
MONGODB_URI="mongodb://user:password@localhost:27017/mydb"
# or
DATABASE_URL="mongodb://localhost:27017/mydb"
```

## Migration Between ORMs

### From Prisma to Mongoose

```bash
# 1. Export data with Prisma
npx prisma db push  # Ensure schema is synced
# Export your data

# 2. Switch to Mongoose
# Update .env
DATABASE_ORM=mongoose
DATABASE_TYPE=mongodb
MONGODB_URI="mongodb://localhost:27017/mydb"

# 3. Import data to MongoDB
# Mongoose creates collections automatically
```

### From Mongoose to Prisma

```bash
# 1. Export MongoDB data
mongoexport --db=mydb --collection=users --out=users.json

# 2. Switch to Prisma
DATABASE_ORM=prisma
DATABASE_TYPE=postgresql
DATABASE_URL="postgresql://localhost:5432/mydb"

# 3. Run Prisma migrations
npx prisma migrate dev

# 4. Import data (write custom script)
```

## Testing

### Run ORM-Specific Tests

```bash
# Prisma tests (PostgreSQL)
npm test tests/integration/user-prisma.test.ts

# Mongoose tests (MongoDB)
# Ensure MongoDB running
docker run -d -p 27017:27017 mongo:7
npm test tests/integration/mongoose-repositories.test.ts
```

## Best Practices

### When to Use Prisma

✅ Modern TypeScript/JavaScript projects
✅ Need strong type safety with auto-generated types
✅ Want excellent VS Code autocomplete
✅ Working with PostgreSQL, MySQL, or SQLite
✅ Prefer declarative schema (schema.prisma)
✅ Need great migration system

### When to Use Mongoose

✅ MongoDB-only projects
✅ Need MongoDB-specific features (aggregations, GridFS)
✅ Prefer schema-based validation in code
✅ Want middleware hooks (pre/post save)
✅ Working with document-oriented data
✅ Need flexible schema evolution

### When to Use Sequelize (Coming Soon)

✅ Existing Sequelize projects
✅ Need mature SQL ORM with wide DB support
✅ Prefer promise-based API
✅ Working with legacy databases

### When to Use TypeORM (Coming Soon)

✅ Like decorator-based approach (@Entity, @Column)
✅ Need Active Record or Data Mapper pattern
✅ Want to support multiple databases simultaneously
✅ TypeScript-first projects

## Performance Considerations

| Aspect | Prisma | Mongoose | Sequelize | TypeORM |
|--------|--------|----------|-----------|---------|
| Query Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Type Safety | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| DX (Developer Experience) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Learning Curve | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| MongoDB Support | ⭐⭐⭐ (Preview) | ⭐⭐⭐⭐⭐ | ❌ | ⭐⭐⭐⭐ |
| SQL Support | ⭐⭐⭐⭐⭐ | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## Troubleshooting

### Prisma Connection Issues

**Problem**: Can't connect to PostgreSQL

**Solution**:
```bash
# Check PostgreSQL is running
pg_isready

# Verify DATABASE_URL format
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

# Run Prisma introspection
npx prisma db pull
```

### Mongoose Connection Issues

**Problem**: Can't connect to MongoDB

**Solution**:
```bash
# Check MongoDB is running
mongosh --eval "db.runCommand({ ping: 1 })"

# Verify MONGODB_URI format
MONGODB_URI="mongodb://localhost:27017/mydb"

# Check MongoDB logs
docker logs <container-id>
```

### Switching ORMs

**Problem**: Want to change ORM after project initialization

**Solution**:
1. Export existing data
2. Update `.env` file (DATABASE_ORM, DATABASE_TYPE, DATABASE_URL)
3. Install new ORM dependencies if needed
4. Run migrations/setup for new ORM
5. Import data
6. Update repository imports in your code

## Roadmap

### Currently Available
- ✅ Prisma (PostgreSQL, MySQL, SQLite, MongoDB)
- ✅ Mongoose (MongoDB)
- ✅ Common interfaces and adapters
- ✅ Repository pattern
- ✅ Factory pattern with validation

### Coming Soon
- 🔄 Sequelize adapter
- 🔄 TypeORM adapter
- 🔄 Automatic migration between ORMs
- 🔄 ORM-agnostic query builder
- 🔄 Advanced transaction support

## Related Documentation

- [Prisma Modules](./modules/USER.md) - User module with Prisma
- [Mongoose Schemas](../src/database/models/mongoose/) - Mongoose schema definitions
- [Database Interfaces](../src/database/interfaces/) - Common interfaces
- [CLI Documentation](../README.md#cli) - CLI usage

## Changelog

### v0.3.0 (2025-12-19)

**Multi-ORM Support - MVP:**
- ✅ Added common database interfaces (IDatabaseAdapter, IRepository)
- ✅ Implemented Factory pattern with lazy loading
- ✅ Created Prisma adapter (PostgreSQL, MySQL, SQLite, MongoDB)
- ✅ Created Mongoose adapter (MongoDB)
- ✅ Implemented Mongoose schemas (User, Payment, Subscription, Plan, Webhook)
- ✅ Implemented Mongoose repositories
- ✅ Added configuration validation
- ✅ Added compatibility matrix
- ✅ Updated CLI to support MongoDB with Mongoose
- ✅ Added integration tests for Mongoose
- ✅ Added comprehensive documentation

### v0.2.0
- Prisma-only support

### v0.1.0
- Initial release
