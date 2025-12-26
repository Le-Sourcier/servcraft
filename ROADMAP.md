# Servcraft Roadmap

This document outlines the planned features and improvements for Servcraft.

---

## Quick Status Overview

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 (v0.2.x) | ✅ Complete | Core CLI Improvements |
| Phase 2 (v0.3.x) | ✅ Complete | Testing & Quality |
| Phase 3 (v0.4.x) | 🔄 In Progress | Advanced Features |
| Phase 4 (v0.5.x) | ⏳ Next | Enterprise Features |
| Phase 5 (v1.0.x) | ⏳ Planned | Stable Release |

### Current Work: v0.4.10 - Swagger UI Live Documentation
Progress: **0/24 tasks** (0%)

---

## Version History

- **v0.4.9** (Current) - Flexible JS module system (ESM/CommonJS + .js/.cjs) ✅
- **v0.4.8** - Automatic module installation during init
- **v0.4.7** - CLI header alignment fix
- **v0.4.6** - Improved CLI design
- **v0.4.5** - Lazy Prisma client initialization
- **v0.4.4** - Prisma client bundling fix
- **v0.4.3** - ESM/CommonJS compatibility fix
- **v0.4.2** - Custom template loading in generate/scaffold
- **v0.4.1** - Custom templates management (init/list)
- **v0.4.0** - Scaffold command for complete CRUD generation
- **v0.3.1** - Test templates with --with-tests flag
- **v0.3.0** - Shell auto-completion, update command, CLI tests, CI/CD
- **v0.2.0** - Better errors, remove, doctor commands
- **v0.1.9** - Added `--dry-run` option
- **v0.1.8** - Added `servcraft list` command
- **v0.1.7** - ESM/CommonJS module system choice

---

## ✅ Implemented Features

### CLI Commands
| Command | Description | Status |
|---------|-------------|--------|
| `servcraft init` | Initialize new project | ✅ |
| `servcraft add <module>` | Add pre-built module | ✅ |
| `servcraft generate` | Generate resources | ✅ |
| `servcraft scaffold` | Generate complete CRUD | ✅ |
| `servcraft list` | List modules | ✅ |
| `servcraft remove` | Remove module | ✅ |
| `servcraft update` | Update modules | ✅ |
| `servcraft doctor` | Diagnose project | ✅ |
| `servcraft completion` | Shell auto-completion | ✅ |
| `servcraft templates` | Manage templates | ✅ |
| `servcraft docs` | API documentation | ✅ |
| `servcraft db` | Database management | ✅ |

### Database Commands (`servcraft db`)
| Command | Description | Status |
|---------|-------------|--------|
| `db migrate` | Run migrations | ✅ |
| `db push` | Push schema changes | ✅ |
| `db generate` | Generate Prisma client | ✅ |
| `db seed` | Run database seed | ✅ |
| `db reset` | Reset database | ✅ |
| `db status` | Show migration status | ✅ |
| `db studio` | Open Prisma Studio | ✅ |

### Documentation Commands (`servcraft docs`)
| Command | Description | Status |
|---------|-------------|--------|
| `docs generate` | Generate OpenAPI spec | ✅ |
| `docs export` | Export to Postman/Insomnia/YAML | ✅ |
| `docs status` | Show documentation status | ✅ |

### Project Features
| Feature | Description | Status |
|---------|-------------|--------|
| TypeScript support | Full TypeScript generation | ✅ |
| JavaScript support | JS with ESM or CommonJS | ✅ |
| Flexible module system | ESM (.js) / CommonJS (.js/.cjs) | ✅ |
| Multiple validators | Zod, Joi, Yup | ✅ |
| Multiple databases | PostgreSQL, MySQL, SQLite, MongoDB | ✅ |
| Custom templates | Project/User/Built-in templates | ✅ |
| Test generation | --with-tests flag | ✅ |
| Dry-run mode | Preview changes | ✅ |

### Pre-built Modules
| Module | Description | Status |
|--------|-------------|--------|
| auth | JWT authentication | ✅ |
| users | User management | ✅ |
| email | Email sending | ✅ |
| cache | Redis caching | ✅ |
| upload | File uploads | ✅ |
| audit | Audit logging | ✅ |
| notifications | Push notifications | ✅ |
| settings | App settings | ✅ |

---

## 🔄 In Progress

### v0.4.10 - Swagger UI Live Documentation
**Status:** 🔄 In Progress
**Priority:** High
**Complexity:** Medium
**Started:** 2024-12-26

Documentation Swagger/OpenAPI en temps réel avec auto-génération.

```bash
# Après démarrage du serveur
GET /docs          → Swagger UI (interface visuelle)
GET /docs/json     → OpenAPI spec en JSON
GET /docs/yaml     → OpenAPI spec en YAML
```

**Objectif:** Quand on fait `servcraft add [module]`, la documentation est automatiquement générée pour toutes les routes du module.

---

#### Checklist d'implémentation

##### Phase 1: Infrastructure de base
- [ ] Ajouter `@fastify/swagger` et `@fastify/swagger-ui` aux dépendances des projets générés
- [ ] Créer le fichier de configuration Swagger (`src/config/swagger.ts`)
- [ ] Intégrer le plugin Swagger dans le serveur Fastify (`src/core/server.ts`)
- [ ] Tester que `/docs` affiche Swagger UI
- [ ] Tester que `/docs/json` retourne la spec OpenAPI

##### Phase 2: Templates TypeScript
- [ ] Mettre à jour le template `init` pour inclure Swagger (TypeScript)
- [ ] Ajouter les schémas OpenAPI au module `auth`
- [ ] Ajouter les schémas OpenAPI au module `users`
- [ ] Ajouter les schémas OpenAPI aux autres modules (email, cache, upload, etc.)
- [ ] Tester la génération complète TypeScript avec `servcraft init test-ts --ts`

##### Phase 3: Templates JavaScript
- [ ] Adapter la configuration Swagger pour JavaScript ESM (.js)
- [ ] Adapter la configuration Swagger pour JavaScript CommonJS (.cjs)
- [ ] Tester `servcraft init test-esm --js --esm`
- [ ] Tester `servcraft init test-cjs --js --cjs`

##### Phase 4: Auto-génération lors de `servcraft add`
- [ ] Mettre à jour `add-module.ts` pour inclure les schémas OpenAPI
- [ ] Tester `servcraft add auth` et vérifier que `/docs` se met à jour
- [ ] Tester `servcraft add users` et vérifier que `/docs` se met à jour
- [ ] Tester avec tous les modules disponibles

##### Phase 5: Tests et validation
- [ ] Écrire des tests unitaires pour la configuration Swagger
- [ ] Écrire des tests d'intégration pour `/docs` endpoint
- [ ] Vérifier que `npm run build` passe sans erreurs
- [ ] Vérifier que `npm run lint` passe sans erreurs
- [ ] Vérifier que `npm run typecheck` passe sans erreurs
- [ ] Vérifier que `npm test` passe sans erreurs

##### Phase 6: Documentation et release
- [ ] Mettre à jour le README avec les nouvelles fonctionnalités
- [ ] Mettre à jour le ROADMAP (marquer comme complété)
- [ ] Commit final avec message descriptif
- [ ] Push vers GitHub
- [ ] Publier v0.4.10 sur npm

---

**Dépendances npm à ajouter aux projets générés:**
```json
{
  "@fastify/swagger": "^8.x",
  "@fastify/swagger-ui": "^2.x"
}
```

**Routes générées:**
| Route | Description |
|-------|-------------|
| `GET /docs` | Swagger UI interface |
| `GET /docs/json` | OpenAPI 3.0 spec (JSON) |
| `GET /docs/yaml` | OpenAPI 3.0 spec (YAML) |
| `GET /docs/static/*` | Assets Swagger UI |

---

## 🚧 Not Yet Implemented

### Phase 4: Enterprise Features (v0.5.x)

#### v0.5.0 - Plugin System
**Status:** ❌ Not Started
**Priority:** High
**Complexity:** Very High

Third-party plugin support for extending Servcraft.

```bash
servcraft plugin install servcraft-graphql
servcraft plugin list
servcraft plugin remove servcraft-graphql
```

**Features to implement:**
- [ ] Plugin discovery and installation from npm
- [ ] Plugin configuration in `.servcraft/plugins.json`
- [ ] Plugin API for adding commands
- [ ] Plugin API for adding module types
- [ ] Plugin API for extending generators
- [ ] Plugin API for adding templates
- [ ] Plugin versioning and updates
- [ ] Plugin validation and security checks

**Technical considerations:**
- Dynamic command registration
- Sandboxed plugin execution
- Dependency resolution between plugins
- Plugin lifecycle hooks (install, uninstall, update)

---

#### v0.5.1 - Deployment Helpers
**Status:** ❌ Not Started
**Priority:** High
**Complexity:** High

Generate deployment configurations for various platforms.

```bash
servcraft deploy init              # Initialize deployment config
servcraft deploy docker            # Generate Dockerfile + docker-compose
servcraft deploy vercel            # Generate vercel.json
servcraft deploy railway           # Generate railway.toml
servcraft deploy fly               # Generate fly.toml
servcraft deploy pm2               # Generate ecosystem.config.js
servcraft deploy systemd           # Generate systemd service file
```

**Features to implement:**
- [ ] `servcraft deploy init` - Interactive deployment setup
- [ ] Docker configuration generation
  - [ ] Dockerfile (multi-stage build)
  - [ ] docker-compose.yml (with database)
  - [ ] .dockerignore
- [ ] Cloud platform configs
  - [ ] Vercel (vercel.json)
  - [ ] Railway (railway.toml)
  - [ ] Fly.io (fly.toml)
  - [ ] Render (render.yaml)
- [ ] Process manager configs
  - [ ] PM2 (ecosystem.config.js)
  - [ ] systemd service file
- [ ] Environment variable management
- [ ] Health check endpoints
- [ ] Database connection guides per platform

**Generated files example (Docker):**
```
project/
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── .dockerignore
└── nginx/
    └── nginx.conf
```

---

#### v0.5.2 - Monorepo Support
**Status:** ❌ Not Started
**Priority:** Medium
**Complexity:** Very High

Support for monorepo project structures.

```bash
servcraft init my-monorepo --monorepo
servcraft workspace add api
servcraft workspace add admin
servcraft workspace add shared
```

**Features to implement:**
- [ ] `--monorepo` flag for init command
- [ ] `servcraft workspace` command group
  - [ ] `workspace add <name>` - Add new workspace
  - [ ] `workspace list` - List workspaces
  - [ ] `workspace remove <name>` - Remove workspace
- [ ] pnpm/yarn/npm workspace support
- [ ] Shared package management
- [ ] Cross-workspace module sharing
- [ ] Turborepo/Nx integration options

**Generated structure:**
```
my-monorepo/
├── packages/
│   ├── api/
│   │   ├── src/
│   │   └── package.json
│   ├── admin/
│   │   ├── src/
│   │   └── package.json
│   └── shared/
│       ├── src/
│       └── package.json
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

#### v0.5.3 - Eject Command
**Status:** ❌ Not Started
**Priority:** Low
**Complexity:** Medium

Expose all internal configurations for full customization.

```bash
servcraft eject                    # Eject everything
servcraft eject --config-only      # Only configuration files
servcraft eject --templates-only   # Only templates
servcraft eject --docker-only      # Only Docker configs
```

**Features to implement:**
- [ ] Export all built-in templates to project
- [ ] Export configuration files
  - [ ] ESLint configuration
  - [ ] Prettier configuration
  - [ ] TypeScript configuration
  - [ ] Vitest configuration
- [ ] Export Docker configurations
- [ ] Export CI/CD templates
  - [ ] GitHub Actions workflows
  - [ ] GitLab CI configuration
- [ ] Post-eject instructions
- [ ] Selective ejection by category

---

### Phase 5: Ecosystem (v1.0.x)

#### v1.0.0 - Stable Release
**Status:** ⏳ Planned
**Priority:** High
**Complexity:** High

Requirements for stable release:
- [ ] All Phase 1-4 features complete
- [ ] 90%+ test coverage
- [ ] Comprehensive documentation
  - [ ] Getting started guide
  - [ ] API reference
  - [ ] Module documentation
  - [ ] Plugin development guide
- [ ] Migration guide from v0.x
- [ ] Performance benchmarks
- [ ] Security audit
- [ ] Breaking change documentation

---

### Future Considerations (Post v1.0)

#### GUI Dashboard
**Status:** 💡 Idea
**Priority:** Low
**Complexity:** Very High

Web-based project management interface.

```bash
servcraft dashboard                # Start web dashboard on localhost:4000
```

**Potential features:**
- [ ] Visual module management (install/remove)
- [ ] Database schema designer (visual Prisma editor)
- [ ] API documentation browser (Swagger UI integration)
- [ ] Log viewer (real-time logs)
- [ ] Environment variable editor
- [ ] Project health monitoring
- [ ] One-click deployments

---

#### GraphQL Support
**Status:** 💡 Idea
**Priority:** Medium
**Complexity:** High

Native GraphQL module and generators.

```bash
servcraft add graphql
servcraft generate resolver users
servcraft generate type User
```

**Potential features:**
- [ ] `graphql` pre-built module
- [ ] GraphQL schema generation from Prisma
- [ ] Resolver generators
- [ ] Type generators
- [ ] Subscription support
- [ ] Apollo/Mercurius integration

---

#### Microservices Support
**Status:** 💡 Idea
**Priority:** Low
**Complexity:** Very High

Tools for building microservice architectures.

```bash
servcraft init my-service --microservice
servcraft service add payment-service
```

**Potential features:**
- [ ] Service mesh templates
- [ ] Message queue integration (RabbitMQ, Kafka, Redis)
- [ ] Service discovery
- [ ] API Gateway configuration
- [ ] gRPC support
- [ ] Event sourcing patterns

---

#### Fastify 5 Migration
**Status:** ⏳ Waiting
**Priority:** Medium
**Complexity:** Medium

When Fastify 5 is released:
- [ ] Update all dependencies
- [ ] Test compatibility
- [ ] Update generated code templates
- [ ] Provide migration guide for existing projects

---

## Implementation Priority

### Next Up (v0.5.0 - v0.5.1)
1. **Plugin System** - Enable community extensions
2. **Docker Configuration** - Essential for deployment
3. **PM2/systemd Configs** - Production process management

### Following (v0.5.2 - v0.5.3)
4. **Cloud Platform Configs** - Vercel, Railway, Fly.io
5. **Eject Command** - Full customization support
6. **Monorepo Support** - Enterprise project structures

### Long-term (v1.0+)
7. **Stable Release** - Documentation, tests, audit
8. **GUI Dashboard** - Visual management
9. **GraphQL Support** - Alternative API style
10. **Microservices** - Distributed architectures

---

## Contributing

Want to help implement these features? See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Feedback

Have suggestions? Open an issue on [GitHub](https://github.com/Le-Sourcier/servcraft/issues).
