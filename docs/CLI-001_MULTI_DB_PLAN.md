# 🗄️ CLI-001 REVISÉ : IMPLÉMENTATION MULTI-DATABASE & MULTI-ORM

**Créé le :** 2025-12-19
**Type :** Feature majeure (était "fix false promise", devient "real implementation")
**Estimation révisée :** 20-30 heures (au lieu de 2h)
**Impact :** Framework production-ready avec choix réels de DB/ORM

---

## 🎯 Vision

Transformer ServCraft en un vrai framework **database-agnostic** avec support de:
- **4 ORMs** : Prisma, Mongoose, Sequelize, TypeORM
- **5 Databases** : PostgreSQL, MySQL, SQLite, MongoDB, MariaDB
- **Architecture unifiée** avec adapters et interfaces communes

---

## 📊 Matrice de Support

| ORM | PostgreSQL | MySQL | SQLite | MongoDB | MariaDB |
|-----|------------|-------|--------|---------|---------|
| **Prisma** | ✅ | ✅ | ✅ | ✅ (expérimental) | ✅ |
| **Mongoose** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Sequelize** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **TypeORM** | ✅ | ✅ | ✅ | ✅ | ✅ |

**Total combinaisons possibles :** ~15 configurations valides

---

## 🏗️ Architecture Proposée

```
src/database/
├── adapters/
│   ├── prisma.adapter.ts        # Prisma universal adapter
│   ├── mongoose.adapter.ts      # MongoDB with Mongoose
│   ├── sequelize.adapter.ts     # SQL with Sequelize
│   └── typeorm.adapter.ts       # TypeORM universal adapter
├── interfaces/
│   ├── database.interface.ts    # Common DB operations
│   ├── repository.interface.ts  # Repository pattern
│   └── transaction.interface.ts # Transaction support
├── models/                       # Shared model definitions
│   ├── user.model.ts
│   ├── payment.model.ts
│   └── ...
├── migrations/                   # Migration handlers per ORM
│   ├── prisma/
│   ├── sequelize/
│   └── typeorm/
└── connection.ts                 # Universal connection factory
```

---

## 📝 PLAN DE DÉVELOPPEMENT DÉTAILLÉ

### **PHASE 1 : Architecture & Interfaces** (4-6h)

#### **CLI-001.1 : Définir interfaces communes** (2h)
Créer les interfaces TypeScript que TOUS les ORMs doivent implémenter:

```typescript
// src/database/interfaces/database.interface.ts
export interface IDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
  migrate(direction?: 'up' | 'down'): Promise<void>;
}

// src/database/interfaces/repository.interface.ts
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findMany(filter?: any, options?: PaginationOptions): Promise<PaginatedResult<T>>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

// src/database/interfaces/transaction.interface.ts
export interface ITransactionManager {
  begin(): Promise<ITransaction>;
}

export interface ITransaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  execute<T>(operation: () => Promise<T>): Promise<T>;
}
```

**Livrable :** Interfaces complètes et documentées

#### **CLI-001.2 : Créer factory pattern** (1h)
```typescript
// src/database/connection.ts
export class DatabaseFactory {
  static createAdapter(
    orm: 'prisma' | 'mongoose' | 'sequelize' | 'typeorm',
    database: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb'
  ): IDatabaseAdapter {
    // Logic to instantiate correct adapter
  }
}
```

**Livrable :** Factory testable et extensible

#### **CLI-001.3 : Design système de configuration** (1h)
```typescript
// src/config/database.config.ts
export interface DatabaseConfig {
  orm: string;
  database: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database_name?: string;
  url?: string;
  // ... other options
}
```

**Livrable :** Configuration unifiée

**Checkpoint 1 :** Commit "feat(database): add multi-orm architecture interfaces"

---

### **PHASE 2 : Implémentation Prisma** (3-4h)

#### **CLI-001.4 : Adapter Prisma** (2h)
Refactoriser le code Prisma existant en adapter:

```typescript
// src/database/adapters/prisma.adapter.ts
export class PrismaAdapter implements IDatabaseAdapter {
  private prisma: PrismaClient;

  async connect(): Promise<void> {
    this.prisma = new PrismaClient();
    await this.prisma.$connect();
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  // ... implement all interface methods
}

// src/database/repositories/prisma/
// - user.repository.ts (refactor existing)
// - payment.repository.ts (refactor existing)
```

**Livrable :** Prisma adapter fonctionnel

#### **CLI-001.5 : Tests Prisma adapter** (1-2h)
- Test connection avec PostgreSQL
- Test avec MySQL
- Test avec SQLite
- Valider tous les repositories existants

**Livrable :** Tests passants pour Prisma

**Checkpoint 2 :** Commit "feat(database): implement prisma adapter"

---

### **PHASE 3 : Implémentation Mongoose** (4-5h)

#### **CLI-001.6 : Adapter Mongoose** (2h)
```typescript
// src/database/adapters/mongoose.adapter.ts
import mongoose from 'mongoose';

export class MongooseAdapter implements IDatabaseAdapter {
  private connection: typeof mongoose | null = null;

  async connect(): Promise<void> {
    this.connection = await mongoose.connect(config.url);
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
  }

  // ... implement interface
}
```

**Livrable :** Mongoose adapter fonctionnel

#### **CLI-001.7 : Créer schemas Mongoose** (1.5h)
```typescript
// src/database/models/mongoose/user.schema.ts
import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  // ... other fields
});

export const UserModel = model('User', userSchema);
```

**Livrable :** Schemas pour User, Payment, etc.

#### **CLI-001.8 : Repository Mongoose** (1h)
```typescript
// src/database/repositories/mongoose/user.repository.ts
export class MongooseUserRepository implements IRepository<User> {
  async findById(id: string): Promise<User | null> {
    return UserModel.findById(id);
  }
  // ... implement all methods
}
```

**Livrable :** Repositories Mongoose

#### **CLI-001.9 : Tests Mongoose** (0.5h)
- Test connection MongoDB
- Test CRUD operations
- Validate schemas

**Livrable :** Tests Mongoose passants

**Checkpoint 3 :** Commit "feat(database): implement mongoose adapter"

---

### **PHASE 4 : Implémentation Sequelize** (4-5h)

#### **CLI-001.10 : Adapter Sequelize** (2h)
```typescript
// src/database/adapters/sequelize.adapter.ts
import { Sequelize } from 'sequelize';

export class SequelizeAdapter implements IDatabaseAdapter {
  private sequelize: Sequelize;

  async connect(): Promise<void> {
    this.sequelize = new Sequelize({
      dialect: config.database, // 'postgres' | 'mysql' | 'sqlite'
      host: config.host,
      // ... config
    });
    await this.sequelize.authenticate();
  }

  // ... implement interface
}
```

**Livrable :** Sequelize adapter

#### **CLI-001.11 : Modèles Sequelize** (1.5h)
```typescript
// src/database/models/sequelize/user.model.ts
import { DataTypes, Model } from 'sequelize';

export class UserModel extends Model {
  declare id: string;
  declare email: string;
  declare password: string;
  // ...
}

export function defineUserModel(sequelize: Sequelize) {
  UserModel.init({
    id: { type: DataTypes.UUID, primaryKey: true },
    email: { type: DataTypes.STRING, unique: true },
    // ...
  }, { sequelize });
}
```

**Livrable :** Modèles Sequelize

#### **CLI-001.12 : Repository Sequelize** (1h)
**Livrable :** Repositories Sequelize

#### **CLI-001.13 : Tests Sequelize** (0.5h)
**Livrable :** Tests pour PostgreSQL, MySQL, SQLite

**Checkpoint 4 :** Commit "feat(database): implement sequelize adapter"

---

### **PHASE 5 : Implémentation TypeORM** (4-5h)

#### **CLI-001.14 : Adapter TypeORM** (2h)
```typescript
// src/database/adapters/typeorm.adapter.ts
import { DataSource } from 'typeorm';

export class TypeORMAdapter implements IDatabaseAdapter {
  private dataSource: DataSource;

  async connect(): Promise<void> {
    this.dataSource = new DataSource({
      type: config.database, // 'postgres' | 'mysql' | 'mongodb' | 'sqlite'
      // ... config
    });
    await this.dataSource.initialize();
  }

  // ... implement interface
}
```

**Livrable :** TypeORM adapter

#### **CLI-001.15 : Entities TypeORM** (1.5h)
```typescript
// src/database/models/typeorm/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  // ... other fields with decorators
}
```

**Livrable :** Entities TypeORM

#### **CLI-001.16 : Repository TypeORM** (1h)
**Livrable :** Repositories TypeORM

#### **CLI-001.17 : Tests TypeORM** (0.5h)
**Livrable :** Tests multi-DB

**Checkpoint 5 :** Commit "feat(database): implement typeorm adapter"

---

### **PHASE 6 : Intégration CLI** (3-4h)

#### **CLI-001.18 : Update CLI prompts** (1h)
```typescript
// Enhanced prompts in init.ts
{
  type: 'list',
  name: 'orm',
  message: 'Select ORM:',
  choices: [
    { name: 'Prisma (Type-safe, Modern)', value: 'prisma' },
    { name: 'Mongoose (MongoDB specialist)', value: 'mongoose' },
    { name: 'Sequelize (SQL veteran)', value: 'sequelize' },
    { name: 'TypeORM (Decorator-based)', value: 'typeorm' },
  ],
},
{
  type: 'list',
  name: 'database',
  message: 'Select database:',
  choices: (answers) => {
    // Dynamic choices based on ORM selection
    return getCompatibleDatabases(answers.orm);
  }
}
```

**Livrable :** CLI intelligent avec validation

#### **CLI-001.19 : Générateurs de code** (1.5h)
Créer fonctions pour générer:
- Connection files pour chaque ORM
- Model/Schema/Entity files
- Repository files
- Migration setup
- Config files (.env, database.config.ts)

**Livrable :** Générateurs complets

#### **CLI-001.20 : Templates validation** (0.5h)
Tester la génération pour chaque combo ORM/DB

**Livrable :** Templates validés

**Checkpoint 6 :** Commit "feat(cli): add multi-orm/db support"

---

### **PHASE 7 : Migration des modules existants** (4-6h)

#### **CLI-001.21 : Adapter Auth module** (1.5h)
Faire fonctionner l'authentification avec tous les ORMs

**Livrable :** Auth universal

#### **CLI-001.22 : Adapter User module** (1.5h)
**Livrable :** User universal

#### **CLI-001.23 : Adapter Payment module** (1.5h)
**Livrable :** Payment universal

#### **CLI-001.24 : Tests cross-ORM** (1.5h)
Vérifier que tous les modules fonctionnent avec tous les ORMs

**Livrable :** Tests intégration complets

**Checkpoint 7 :** Commit "feat(modules): add universal orm support"

---

### **PHASE 8 : Documentation** (2-3h)

#### **CLI-001.25 : Guide de choix ORM/DB** (1h)
```markdown
# Choosing Database & ORM

## When to use Prisma
- Modern TypeScript projects
- Strong type safety needed
- Auto-generated types
- Good DX with migrations
- Best for: PostgreSQL, MySQL

## When to use Mongoose
- MongoDB projects
- Schema validation needed
- Document-oriented data
- Best for: MongoDB

## When to use Sequelize
- Legacy SQL projects
- Wide DB support needed
- Mature ecosystem
- Best for: PostgreSQL, MySQL, MariaDB

## When to use TypeORM
- Decorator fans
- Multi-DB projects
- Active Record or Data Mapper pattern
- Best for: All databases

## Performance Comparison
[Benchmarks here]
```

**Livrable :** Guide complet

#### **CLI-001.26 : Documentation technique** (1h)
- Architecture multi-ORM
- Création de nouveaux adapters
- Extension du système
- Best practices

**Livrable :** Docs techniques

#### **CLI-001.27 : Migration guides** (1h)
- Prisma → Sequelize
- Mongoose → TypeORM
- Etc.

**Livrable :** Migration guides

**Checkpoint 8 :** Commit "docs: add comprehensive multi-orm documentation"

---

## 📊 Récapitulatif

| Phase | Tâches | Temps | Complexité |
|-------|--------|-------|------------|
| 1. Architecture | 3 | 4-6h | ⭐⭐⭐ |
| 2. Prisma | 2 | 3-4h | ⭐⭐ |
| 3. Mongoose | 4 | 4-5h | ⭐⭐⭐ |
| 4. Sequelize | 4 | 4-5h | ⭐⭐⭐ |
| 5. TypeORM | 4 | 4-5h | ⭐⭐⭐ |
| 6. CLI Integration | 3 | 3-4h | ⭐⭐⭐ |
| 7. Module Migration | 4 | 4-6h | ⭐⭐⭐⭐ |
| 8. Documentation | 3 | 2-3h | ⭐⭐ |
| **TOTAL** | **27** | **28-38h** | - |

---

## 🎯 Valeur Ajoutée

### Pour les développeurs
✅ Vrai choix de DB/ORM (pas de vendor lock-in)
✅ Migration facile entre ORMs
✅ Pattern unifié quel que soit le choix
✅ Type safety partout

### Pour le projet ServCraft
✅ Feature unique dans l'écosystème Node.js
✅ Flexibilité maximale
✅ Production-ready pour tous usages
✅ Différenciation compétitive majeure

---

## 🚀 Approche Progressive

### MVP (Phase 1-2-3) : 11-15h
- Architecture + Prisma + Mongoose
- Couvre 80% des use cases
- PostgreSQL + MongoDB support

### Version complète (Phases 4-8) : +17-23h
- Sequelize + TypeORM
- Documentation complète
- Migration de tous les modules

---

## ❓ Décision à Prendre

**Option A :** MVP d'abord (Prisma + Mongoose, 11-15h)
- Livre rapidement de la valeur
- Teste l'architecture
- Complète Phase 1 partiellement

**Option B :** Implémentation complète (28-38h)
- Feature complète et différenciante
- Mais retarde QUEUE-001

**Option C :** Garder plan initial (retirer MongoDB, 2h)
- Termine Phase 1 rapidement
- Repousse multi-ORM à Phase 2

---

**Quelle option préférez-vous ?**
1. MVP (Prisma + Mongoose)
2. Implémentation complète
3. Plan original (retirer MongoDB)

Ou une autre approche ?
