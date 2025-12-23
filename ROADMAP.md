# Servcraft Roadmap

This document outlines the planned features and improvements for Servcraft.

## Version History

- **v0.4.8** (Current) - Automatic module installation during init - Phase 3 in progress 🚧
- **v0.4.7** - CLI header alignment fix
- **v0.4.6** - Improved CLI design
- **v0.4.5** - Lazy Prisma client initialization
- **v0.4.4** - Prisma client bundling fix
- **v0.4.3** - ESM/CommonJS compatibility fix
- **v0.4.2** - Custom template loading in generate/scaffold
- **v0.4.1** - Custom templates management (init/list)
- **v0.4.0** - Scaffold command for complete CRUD generation
- **v0.3.1** - Test templates with --with-tests flag - Phase 2 complete ✅
- **v0.3.0** - Shell auto-completion, update command, comprehensive CLI tests (30 tests), CI/CD on Node.js 18/20/22
- **v0.2.0** - Better errors, remove, doctor, update (stub) - Phase 1 complete ✅
- **v0.1.9** - Added `--dry-run` option for all commands (init, add, generate)
- **v0.1.8** - Added `servcraft list` command
- **v0.1.7** - ESM/CommonJS module system choice
- **v0.1.6.3** - JavaScript/TypeScript support, docs command, bug fixes
- **v0.1.6.2** - Fixed empty modules, added config/middleware/utils generators
- **v0.1.6.1** - Added @fastify/jwt compatibility fix
- **v0.1.6** - Fixed module copying from package

---

## Phase 1: Core CLI Improvements (v0.2.x) ✅ COMPLETE

**Achievements:**
- ✅ `servcraft list` - List available and installed modules
- ✅ `--dry-run` - Preview changes for init, add, generate commands
- ✅ Better error messages - Suggestions, colored output, docs links
- ✅ `servcraft remove` - Remove modules with confirmation
- ✅ `servcraft doctor` - Diagnose project configuration
- ⏳ `servcraft update` - Stub created for v0.2.1

---

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
servcraft generate module users --dry-run  # ✅ Implemented
servcraft generate controller users --dry-run  # ✅ Implemented
servcraft generate service users --dry-run     # ✅ Implemented
```

#### Better Error Messages
- Descriptive error messages with suggestions
- Colored output for warnings/errors
- Links to documentation

**Estimated complexity:** Low

---

### v0.2.1 - Module Management

#### `servcraft remove <module>` ✅ Completed in v0.2.0
Remove an installed module.
```bash
servcraft remove auth
servcraft remove auth --yes          # Skip confirmation
servcraft remove auth --keep-env     # Keep environment variables
```

Features:
- ✅ Remove module files from `src/modules/`
- ✅ Interactive confirmation
- ✅ Show cleanup instructions
- ✅ Alias: rm

#### `servcraft update [module]` ✅ Completed in v0.3.0
Update modules to latest version.
```bash
servcraft update           # Update all modules
servcraft update auth      # Update specific module
servcraft update --check   # Check for updates without applying
servcraft update --yes     # Skip confirmation
```

Features:
- ✅ Update specific module or all installed modules
- ✅ Interactive confirmation before updating
- ✅ Check mode to see what would be updated
- ✅ Overwrites existing files with latest version
- ✅ Error handling and validation

Note: Version tracking will be added in a future release. Currently always installs latest version.

**Estimated complexity:** Medium

---

### v0.2.2 - Developer Experience

#### `servcraft doctor` ✅ Completed in v0.2.0
Diagnose project configuration issues.
```bash
servcraft doctor
```

Checks:
- ✅ Node.js version compatibility
- ✅ package.json and Fastify
- ✅ Project directories (src, node_modules)
- ✅ Git repository
- ✅ .env file

#### Shell Auto-completion ✅ Completed in v0.3.0
```bash
servcraft completion bash >> ~/.bashrc
servcraft completion zsh >> ~/.zshrc
```

Features:
- ✅ Bash completion script with command and module suggestions
- ✅ Zsh completion script with descriptions
- ✅ Autocomplete for all commands, subcommands, and modules
- ✅ Support for aliases (g, m, c, s, etc.)

**Estimated complexity:** Medium

---

## Phase 2: Testing & Quality (v0.3.x) 🚧 In Progress

### v0.3.0 - CLI Tests

#### Unit Tests for CLI Commands
- ✅ Test `list` command (3 tests passing)
- ✅ Test `doctor` command (3 tests passing)
- ✅ Test `--dry-run` option (2 tests passing)
- ✅ Test `init` command with various options (4 tests: --js, --cjs, --esm, --dry-run)
- ✅ Test `generate` command variants (3 tests: controller, service, module)
- ✅ Test error handling (2 tests: invalid module, documentation links)
- ✅ Test `add` command for modules (3 tests: validation, error handling, help)
- ✅ Test `remove` command (3 tests: validation, help, alias)
- ✅ Test `update` command (3 tests: validation, check flag, help)
- ✅ Test `completion` command (4 tests: bash, zsh, error, help)

#### CI/CD Pipeline
- ✅ GitHub Actions configured
- ✅ Tests run on Node.js 18, 20, 22 (matrix strategy)
- ✅ Coverage reporting configured
- ✅ PostgreSQL and Redis services for integration tests
- ✅ Lint, typecheck, build, test, security audit jobs

**Status:** 30 CLI tests added and passing ✅ (111 total tests including integration tests)

**Estimated complexity:** High

---

### v0.3.1 - Generated Project Tests ✅ Completed

#### Test Templates
Generate test files alongside modules:
```bash
servcraft generate module users --with-tests
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

Features:
- ✅ Controller test templates with Fastify injection
- ✅ Service test templates with unit test structure
- ✅ Integration test templates with full CRUD workflow
- ✅ --with-tests flag for generate module command
- ✅ Vitest test structure and assertions
- ✅ TODO comments for customization

**Estimated complexity:** Medium

---

## Phase 3: Advanced Features (v0.4.x)

### v0.4.0 - Scaffolding ✅ Completed

#### `servcraft scaffold <resource>`
Generate complete CRUD with single command.
```bash
servcraft scaffold product --fields "name:string price:number category:string?"
servcraft scaffold user --fields "name:string email:email age:number?" --validator zod
```

Generates:
- ✅ Prisma model (with proper types and indexes)
- ✅ Controller with CRUD endpoints
- ✅ Service with business logic
- ✅ Repository with data access
- ✅ Routes with validation
- ✅ Types/DTOs (interface, Create, Update, Filters)
- ✅ Schemas (Zod/Joi/Yup validators)
- ✅ Test files (controller, service, integration)

Features:
- Parses field definitions with types and modifiers
- Supports optional fields (?)
- Generates complete Prisma model ready to copy
- Includes all CRUD operations
- Automatically generates tests with --with-tests behavior
- Supports all validators (zod, joi, yup)

**Estimated complexity:** High

---

### v0.4.1 - Custom Templates ✅ Completed

#### Template System
Allow users to customize generated code.

```bash
servcraft templates init           # Create .servcraft/templates/
servcraft templates list           # List available templates
```

Features:
- ✅ `servcraft templates init` - Initialize custom template directory
- ✅ `servcraft templates list` - List project/user/built-in templates
- ✅ Project templates in `.servcraft/templates/`
- ✅ User templates in `~/.servcraft/templates/`
- ✅ Built-in template fallback
- ✅ Example template file created on init
- ✅ Support for all 10 template types

Template locations (priority order):
1. Project `.servcraft/templates/`
2. User `~/.servcraft/templates/`
3. Built-in defaults

**Estimated complexity:** High

---

### v0.4.2 - Template Loading ✅ Completed

#### Custom Template Loading
Automatically use custom templates in generate/scaffold commands.

Features:
- ✅ Template loader utility with priority-based loading
- ✅ `generate` command uses custom templates automatically
- ✅ `scaffold` command uses custom templates automatically
- ✅ Falls back to built-in templates when custom not found
- ✅ Supports all 10 template types seamlessly
- ✅ No additional flags needed - works out of the box

**Estimated complexity:** Medium

---

### v0.4.3 - Plugin System

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
