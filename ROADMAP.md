# Servcraft Roadmap

This document outlines the planned features and improvements for Servcraft.

## Version History

- **v0.1.9** (Current) - Added `--dry-run` option for init and add commands
- **v0.1.8** - Added `servcraft list` command
- **v0.1.7** - ESM/CommonJS module system choice
- **v0.1.6.3** - JavaScript/TypeScript support, docs command, bug fixes
- **v0.1.6.2** - Fixed empty modules, added config/middleware/utils generators
- **v0.1.6.1** - Added @fastify/jwt compatibility fix
- **v0.1.6** - Fixed module copying from package

---

## Phase 1: Core CLI Improvements (v0.2.x)

### v0.2.0 - CLI Enhancements

#### `servcraft list` ✅ Completed in v0.1.8
List available and installed modules.
```bash
servcraft list                      # List all available modules
servcraft list --installed          # List installed modules only
servcraft list --category Security  # Filter by category
servcraft list --json               # Output as JSON
```

#### `--dry-run` Option ✅ Completed in v0.1.9
Preview changes without writing files.
```bash
servcraft init my-app --dry-run       # ✅ Implemented
servcraft add auth --dry-run           # ✅ Implemented
servcraft generate module users --dry-run  # ⏳ Pending
```

#### Better Error Messages
- Descriptive error messages with suggestions
- Colored output for warnings/errors
- Links to documentation

**Estimated complexity:** Low

---

### v0.2.1 - Module Management

#### `servcraft remove <module>`
Remove an installed module.
```bash
servcraft remove auth
servcraft remove auth --keep-migrations  # Keep database migrations
```

Features:
- Remove module files from `src/modules/`
- Clean up related environment variables
- Optionally remove database migrations
- Update imports in main files

#### `servcraft update [module]`
Update modules to latest version.
```bash
servcraft update           # Update all modules
servcraft update auth      # Update specific module
servcraft update --check   # Check for updates without applying
```

**Estimated complexity:** Medium

---

### v0.2.2 - Developer Experience

#### `servcraft doctor`
Diagnose project configuration issues.
```bash
servcraft doctor
```

Checks:
- Node.js version compatibility
- Missing dependencies
- Environment variables validation
- Database connection
- TypeScript configuration
- Prisma schema sync status

#### Shell Auto-completion
```bash
servcraft completion bash >> ~/.bashrc
servcraft completion zsh >> ~/.zshrc
```

**Estimated complexity:** Medium

---

## Phase 2: Testing & Quality (v0.3.x)

### v0.3.0 - CLI Tests

#### Unit Tests for CLI Commands
- Test `init` command with various options
- Test `add` command for all 20 modules
- Test `generate` command (module, controller, service, etc.)
- Test `db` commands
- Test `docs` commands

#### Integration Tests
- Full project generation and startup
- Module installation and removal
- Database operations

#### CI/CD Pipeline
- GitHub Actions for automated testing
- Test on Node.js 18, 20, 22
- Code coverage reporting

**Estimated complexity:** High

---

### v0.3.1 - Generated Project Tests

#### Test Templates
Generate test files alongside modules:
```bash
servcraft generate module users --with-tests
servcraft add auth  # Includes test files
```

Generated test structure:
```
src/modules/users/
├── users.controller.ts
├── users.service.ts
├── users.repository.ts
├── __tests__/
│   ├── users.controller.test.ts
│   ├── users.service.test.ts
│   └── users.integration.test.ts
```

**Estimated complexity:** Medium

---

## Phase 3: Advanced Features (v0.4.x)

### v0.4.0 - Scaffolding

#### `servcraft scaffold <resource>`
Generate complete CRUD with single command.
```bash
servcraft scaffold product --fields "name:string price:number category:relation"
```

Generates:
- Prisma model
- Controller with CRUD endpoints
- Service with business logic
- Repository with data access
- Routes with validation
- Types/DTOs
- Tests

**Estimated complexity:** High

---

### v0.4.1 - Custom Templates

#### Template System
Allow users to customize generated code.

```bash
servcraft templates init           # Create .servcraft/templates/
servcraft templates list           # List available templates
servcraft generate module --template custom-module
```

Template locations:
1. Project `.servcraft/templates/`
2. User `~/.servcraft/templates/`
3. Built-in defaults

**Estimated complexity:** High

---

### v0.4.2 - Plugin System

#### Third-party Plugins
```bash
servcraft plugin install servcraft-graphql
servcraft plugin list
servcraft plugin remove servcraft-graphql
```

Plugin capabilities:
- Add new commands
- Add new module types
- Extend existing generators
- Add new templates

**Estimated complexity:** Very High

---

## Phase 4: Enterprise Features (v0.5.x)

### v0.5.0 - Deployment

#### `servcraft deploy`
Deploy to cloud platforms.
```bash
servcraft deploy vercel
servcraft deploy railway
servcraft deploy fly
servcraft deploy docker
```

Features:
- Auto-detect platform
- Generate platform-specific configs
- Environment variable management
- Database provisioning guides

**Estimated complexity:** High

---

### v0.5.1 - Monorepo Support

#### Workspace Support
```bash
servcraft init my-monorepo --monorepo
servcraft workspace add api
servcraft workspace add admin
```

Structure:
```
my-monorepo/
├── packages/
│   ├── api/
│   ├── admin/
│   └── shared/
├── package.json
└── pnpm-workspace.yaml
```

**Estimated complexity:** Very High

---

### v0.5.2 - Eject

#### `servcraft eject`
Expose all internal configurations.
```bash
servcraft eject                    # Eject everything
servcraft eject --config-only      # Only configuration files
```

Ejects:
- Build configuration
- ESLint/Prettier configs
- Docker configurations
- CI/CD templates

**Estimated complexity:** Medium

---

## Phase 5: Ecosystem (v1.0.x)

### v1.0.0 - Stable Release

#### Requirements for v1.0:
- [ ] All Phase 1-3 features complete
- [ ] 90%+ test coverage
- [ ] Comprehensive documentation
- [ ] Migration guide from v0.x
- [ ] Performance benchmarks
- [ ] Security audit

---

### Future Considerations

#### GUI Dashboard
Web-based project management interface.
- Visual module management
- Database schema designer
- API documentation browser
- Log viewer

#### Fastify 5 Migration
- Update all dependencies
- Test compatibility
- Provide migration guide

#### GraphQL Support
- `servcraft add graphql`
- Schema generation
- Resolver templates

#### Microservices
- Service mesh templates
- Message queue integration
- Service discovery

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to contribute to this roadmap.

## Feedback

Have suggestions? Open an issue on [GitHub](https://github.com/Le-Sourcier/servcraft/issues).
