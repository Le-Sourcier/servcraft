import { Command } from 'commander';
import path from 'path';
import fs from 'fs/promises';
import ora from 'ora';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { ensureDir, writeFile, error, warn } from '../utils/helpers.js';
import { DryRunManager } from '../utils/dry-run.js';

interface InitOptions {
  name: string;
  language: 'typescript' | 'javascript';
  moduleSystem: 'esm' | 'commonjs';
  database: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'none';
  orm: 'prisma' | 'mongoose' | 'none';
  validator: 'zod' | 'joi' | 'yup';
  features: string[];
}

export const initCommand = new Command('init')
  .alias('new')
  .description('Initialize a new Servcraft project')
  .argument('[name]', 'Project name')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('--ts, --typescript', 'Use TypeScript (default)')
  .option('--js, --javascript', 'Use JavaScript')
  .option('--esm', 'Use ES Modules (import/export) - default')
  .option('--cjs, --commonjs', 'Use CommonJS (require/module.exports)')
  .option('--db <database>', 'Database type (postgresql, mysql, sqlite, mongodb, none)')
  .option('--dry-run', 'Preview changes without writing files')
  .action(
    async (
      name?: string,
      cmdOptions?: {
        yes?: boolean;
        typescript?: boolean;
        javascript?: boolean;
        esm?: boolean;
        commonjs?: boolean;
        db?: string;
        dryRun?: boolean;
      }
    ) => {
      // Enable dry-run mode if specified
      const dryRun = DryRunManager.getInstance();
      if (cmdOptions?.dryRun) {
        dryRun.enable();
        console.log(chalk.yellow('\n⚠ DRY RUN MODE - No files will be written\n'));
      }

      console.log('');
      console.log(chalk.cyan('╭───────────────────────────────────────╮'));
      console.log(chalk.cyan('│') + '                                       ' + chalk.cyan('│'));
      console.log(
        chalk.cyan('│') +
          '   ' +
          chalk.bold.white('🚀 Servcraft') +
          chalk.gray(' - Project Generator') +
          '   ' +
          chalk.cyan('│')
      );
      console.log(
        chalk.cyan('│') +
          '      ' +
          chalk.gray('by ') +
          chalk.blue('Yao Logan') +
          chalk.gray(' (@Le-Sourcier)') +
          '     ' +
          chalk.cyan('│')
      );
      console.log(
        chalk.cyan('│') +
          '         ' +
          chalk.bgBlue.white(' in/yao-logan ') +
          '         ' +
          chalk.cyan('│')
      );
      console.log(chalk.cyan('│') + '                                       ' + chalk.cyan('│'));
      console.log(chalk.cyan('╰───────────────────────────────────────╯'));
      console.log('');

      let options: InitOptions;

      if (cmdOptions?.yes) {
        const db = (cmdOptions.db as InitOptions['database']) || 'postgresql';
        options = {
          name: name || 'my-servcraft-app',
          language: cmdOptions.javascript ? 'javascript' : 'typescript',
          moduleSystem: cmdOptions.commonjs ? 'commonjs' : 'esm',
          database: db,
          orm: db === 'mongodb' ? 'mongoose' : db === 'none' ? 'none' : 'prisma',
          validator: 'zod',
          features: ['auth', 'users', 'email'],
        };
      } else {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: '📦 Project name:',
            default: name || 'my-servcraft-app',
            validate: (input: string) => {
              if (!/^[a-z0-9-_]+$/i.test(input)) {
                return '❌ Project name can only contain letters, numbers, hyphens, and underscores';
              }
              return true;
            },
          },
          {
            type: 'list',
            name: 'language',
            message: '💻 Select language:',
            choices: [
              { name: '✨ TypeScript (Recommended)', value: 'typescript' },
              { name: '   JavaScript', value: 'javascript' },
            ],
            default: 'typescript',
          },
          {
            type: 'list',
            name: 'moduleSystem',
            message: '📦 Select module system:',
            choices: [
              { name: '✨ ESM (import/export) - Recommended', value: 'esm' },
              { name: '   CommonJS (require/module.exports)', value: 'commonjs' },
            ],
            default: 'esm',
          },
          {
            type: 'list',
            name: 'database',
            message: '🗄️  Select database:',
            choices: [
              { name: '✨ PostgreSQL (Recommended)', value: 'postgresql' },
              { name: '   MySQL', value: 'mysql' },
              { name: '   SQLite (Development)', value: 'sqlite' },
              { name: '   MongoDB (NoSQL)', value: 'mongodb' },
              { name: '   None (Add later)', value: 'none' },
            ],
            default: 'postgresql',
          },
          {
            type: 'list',
            name: 'validator',
            message: '✅ Select validation library:',
            choices: [
              { name: '✨ Zod (TypeScript-first)', value: 'zod' },
              { name: '   Joi (Battle-tested)', value: 'joi' },
              { name: '   Yup (Lightweight)', value: 'yup' },
            ],
            default: 'zod',
          },
          {
            type: 'checkbox',
            name: 'features',
            message: '🔧 Select features to include:',
            choices: [
              { name: 'Authentication (JWT)', value: 'auth', checked: true },
              { name: 'User Management', value: 'users', checked: true },
              { name: 'Email Service', value: 'email', checked: true },
              { name: 'Audit Logs', value: 'audit', checked: false },
              { name: 'File Upload', value: 'upload', checked: false },
              { name: 'Redis Cache', value: 'redis', checked: false },
            ],
          },
        ]);

        // Auto-determine ORM based on database choice
        const db = answers.database as InitOptions['database'];
        options = {
          ...answers,
          orm: db === 'mongodb' ? 'mongoose' : db === 'none' ? 'none' : 'prisma',
        } as InitOptions;
      }

      const projectDir = path.resolve(process.cwd(), options.name);
      const spinner = ora('Creating project...').start();

      try {
        // Check if directory exists
        try {
          await fs.access(projectDir);
          spinner.stop();
          error(`Directory "${options.name}" already exists`);
          return;
        } catch {
          // Directory doesn't exist, continue
        }

        // Create project directory
        await ensureDir(projectDir);

        spinner.text = 'Generating project files...';

        // Generate package.json
        const packageJson = generatePackageJson(options);
        await writeFile(
          path.join(projectDir, 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        // Generate tsconfig or jsconfig
        if (options.language === 'typescript') {
          await writeFile(path.join(projectDir, 'tsconfig.json'), generateTsConfig(options));
          await writeFile(path.join(projectDir, 'tsup.config.ts'), generateTsupConfig(options));
        } else {
          await writeFile(path.join(projectDir, 'jsconfig.json'), generateJsConfig(options));
        }

        // Generate .env files
        await writeFile(path.join(projectDir, '.env.example'), generateEnvExample(options));
        await writeFile(path.join(projectDir, '.env'), generateEnvExample(options));

        // Generate .gitignore
        await writeFile(path.join(projectDir, '.gitignore'), generateGitignore());

        // Generate Docker files
        await writeFile(path.join(projectDir, 'Dockerfile'), generateDockerfile(options));
        await writeFile(
          path.join(projectDir, 'docker-compose.yml'),
          generateDockerCompose(options)
        );

        // Create directory structure
        // For JS: .js for ESM, .cjs for CommonJS
        // For TS: always .ts (output format handled by tsup)
        const ext =
          options.language === 'typescript' ? 'ts' : options.moduleSystem === 'esm' ? 'js' : 'cjs';
        const dirs = [
          'src/core',
          'src/config',
          'src/modules',
          'src/middleware',
          'src/utils',
          'src/types',
          'tests/unit',
          'tests/integration',
        ];

        if (options.orm === 'prisma') {
          dirs.push('prisma');
        }
        if (options.orm === 'mongoose') {
          dirs.push('src/database/models');
        }

        for (const dir of dirs) {
          await ensureDir(path.join(projectDir, dir));
        }

        // Generate main entry file
        await writeFile(path.join(projectDir, `src/index.${ext}`), generateEntryFile(options));

        // Generate core files
        await writeFile(
          path.join(projectDir, `src/core/server.${ext}`),
          generateServerFile(options)
        );
        await writeFile(
          path.join(projectDir, `src/core/logger.${ext}`),
          generateLoggerFile(options)
        );

        // Generate config file
        await writeFile(
          path.join(projectDir, `src/config/index.${ext}`),
          generateConfigFile(options)
        );

        // Generate middleware file
        await writeFile(
          path.join(projectDir, `src/middleware/index.${ext}`),
          generateMiddlewareFile(options)
        );

        // Generate utils file
        await writeFile(
          path.join(projectDir, `src/utils/index.${ext}`),
          generateUtilsFile(options)
        );

        // Generate types file
        await writeFile(
          path.join(projectDir, `src/types/index.${ext}`),
          generateTypesFile(options)
        );

        // Generate database files based on ORM choice
        if (options.orm === 'prisma') {
          await writeFile(
            path.join(projectDir, 'prisma/schema.prisma'),
            generatePrismaSchema(options)
          );
        } else if (options.orm === 'mongoose') {
          await writeFile(
            path.join(projectDir, `src/database/connection.${ext}`),
            generateMongooseConnection(options)
          );
          await writeFile(
            path.join(projectDir, `src/database/models/user.model.${ext}`),
            generateMongooseUserModel(options)
          );
        }

        spinner.succeed('Project files generated!');

        // Install dependencies (skip in dry-run mode)
        if (!cmdOptions?.dryRun) {
          const installSpinner = ora('Installing dependencies...').start();

          try {
            execSync('npm install', { cwd: projectDir, stdio: 'pipe' });
            installSpinner.succeed('Dependencies installed!');
          } catch {
            installSpinner.warn('Failed to install dependencies automatically');
            warn('  Run "npm install" manually in the project directory');
          }
        }

        // Print success message
        if (!cmdOptions?.dryRun) {
          console.log('\n' + chalk.green('✨ Project created successfully!'));
        }
        console.log('\n' + chalk.bold('📁 Project structure:'));
        console.log(`
  ${options.name}/
  ├── src/
  │   ├── core/           # Core server, logger
  │   ├── config/         # Configuration
  │   ├── modules/        # Feature modules
  │   ├── middleware/     # Middlewares
  │   ├── utils/          # Utilities
  │   └── index.${ext}       # Entry point
  ├── tests/              # Tests
  ├── prisma/             # Database schema
  ├── docker-compose.yml
  └── package.json
`);

        console.log(chalk.bold('🚀 Get started:'));
        console.log(`
  ${chalk.cyan(`cd ${options.name}`)}
  ${options.database !== 'none' ? chalk.cyan('npm run db:push        # Setup database') : ''}
  ${chalk.cyan('npm run dev            # Start development server')}
`);

        console.log(chalk.bold('📚 Available commands:'));
        console.log(`
  ${chalk.yellow('servcraft generate module <name>')}    Generate a new module
  ${chalk.yellow('servcraft generate controller <name>')} Generate a controller
  ${chalk.yellow('servcraft generate service <name>')}    Generate a service
  ${chalk.yellow('servcraft add auth')}                   Add authentication module
`);

        // Show dry-run summary if enabled
        if (cmdOptions?.dryRun) {
          dryRun.printSummary();
        }
      } catch (err) {
        spinner.fail('Failed to create project');
        error(err instanceof Error ? err.message : String(err));
      }
    }
  );

function generatePackageJson(options: InitOptions): Record<string, unknown> {
  const isTS = options.language === 'typescript';
  const isESM = options.moduleSystem === 'esm';

  // Determine dev command based on language and module system
  let devCommand: string;
  if (isTS) {
    devCommand = 'tsx watch src/index.ts';
  } else if (isESM) {
    devCommand = 'node --watch src/index.js';
  } else {
    devCommand = 'node --watch src/index.cjs';
  }

  // Determine start command
  let startCommand: string;
  if (isTS) {
    startCommand = isESM ? 'node dist/index.js' : 'node dist/index.cjs';
  } else if (isESM) {
    startCommand = 'node src/index.js';
  } else {
    startCommand = 'node src/index.cjs';
  }

  const pkg: Record<string, unknown> = {
    name: options.name,
    version: '0.1.0',
    description: 'A Servcraft application',
    main: isTS
      ? isESM
        ? 'dist/index.js'
        : 'dist/index.cjs'
      : isESM
        ? 'src/index.js'
        : 'src/index.cjs',
    ...(isESM && { type: 'module' }),
    scripts: {
      dev: devCommand,
      build: isTS ? 'tsup' : 'echo "No build needed for JS"',
      start: startCommand,
      test: 'vitest',
      lint: isTS ? 'eslint src --ext .ts' : 'eslint src --ext .js,.cjs',
    },
    dependencies: {
      fastify: '^4.28.1',
      '@fastify/cors': '^9.0.1',
      '@fastify/helmet': '^11.1.1',
      '@fastify/jwt': '^8.0.1',
      '@fastify/rate-limit': '^9.1.0',
      '@fastify/cookie': '^9.3.1',
      pino: '^9.5.0',
      'pino-pretty': '^11.3.0',
      bcryptjs: '^2.4.3',
      dotenv: '^16.4.5',
    },
    devDependencies: {
      vitest: '^2.1.8',
    },
  };

  // Add validator library based on choice
  switch (options.validator) {
    case 'zod':
      (pkg.dependencies as Record<string, string>).zod = '^3.23.8';
      break;
    case 'joi':
      (pkg.dependencies as Record<string, string>).joi = '^17.13.3';
      break;
    case 'yup':
      (pkg.dependencies as Record<string, string>).yup = '^1.4.0';
      break;
  }

  if (isTS) {
    (pkg.devDependencies as Record<string, string>).typescript = '^5.7.2';
    (pkg.devDependencies as Record<string, string>).tsx = '^4.19.2';
    (pkg.devDependencies as Record<string, string>).tsup = '^8.3.5';
    (pkg.devDependencies as Record<string, string>)['@types/node'] = '^22.10.1';
    (pkg.devDependencies as Record<string, string>)['@types/bcryptjs'] = '^2.4.6';
  }

  if (options.orm === 'prisma') {
    (pkg.dependencies as Record<string, string>)['@prisma/client'] = '^5.22.0';
    (pkg.devDependencies as Record<string, string>).prisma = '^5.22.0';
    (pkg.scripts as Record<string, string>)['db:generate'] = 'prisma generate';
    (pkg.scripts as Record<string, string>)['db:migrate'] = 'prisma migrate dev';
    (pkg.scripts as Record<string, string>)['db:push'] = 'prisma db push';
    (pkg.scripts as Record<string, string>)['db:studio'] = 'prisma studio';
  }

  if (options.orm === 'mongoose') {
    (pkg.dependencies as Record<string, string>).mongoose = '^8.8.4';
    if (isTS) {
      (pkg.devDependencies as Record<string, string>)['@types/mongoose'] = '^5.11.97';
    }
  }

  if (options.features.includes('email')) {
    (pkg.dependencies as Record<string, string>).nodemailer = '^6.9.15';
    (pkg.dependencies as Record<string, string>).handlebars = '^4.7.8';
    if (isTS) {
      (pkg.devDependencies as Record<string, string>)['@types/nodemailer'] = '^6.4.17';
    }
  }

  if (options.features.includes('redis')) {
    (pkg.dependencies as Record<string, string>).ioredis = '^5.4.1';
  }

  return pkg;
}

function generateTsConfig(options: InitOptions): string {
  const isESM = options.moduleSystem === 'esm';

  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: isESM ? 'NodeNext' : 'CommonJS',
        moduleResolution: isESM ? 'NodeNext' : 'Node',
        lib: ['ES2022'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        sourceMap: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    },
    null,
    2
  );
}

function generateJsConfig(options: InitOptions): string {
  const isESM = options.moduleSystem === 'esm';

  return JSON.stringify(
    {
      compilerOptions: {
        module: isESM ? 'NodeNext' : 'CommonJS',
        moduleResolution: isESM ? 'NodeNext' : 'Node',
        target: 'ES2022',
        checkJs: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules'],
    },
    null,
    2
  );
}

function generateTsupConfig(options: InitOptions): string {
  const isESM = options.moduleSystem === 'esm';

  return `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['${isESM ? 'esm' : 'cjs'}'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
});
`;
}

function generateEnvExample(options: InitOptions): string {
  let env = `# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# JWT
JWT_SECRET=your-super-secret-key-min-32-characters
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
`;

  if (options.database === 'postgresql') {
    env += `
# Database (PostgreSQL)
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
`;
  } else if (options.database === 'mysql') {
    env += `
# Database (MySQL)
DATABASE_PROVIDER=mysql
DATABASE_URL="mysql://user:password@localhost:3306/mydb"
`;
  } else if (options.database === 'sqlite') {
    env += `
# Database (SQLite)
DATABASE_PROVIDER=sqlite
DATABASE_URL="file:./dev.db"
`;
  } else if (options.database === 'mongodb') {
    env += `
# Database (MongoDB)
MONGODB_URI="mongodb://localhost:27017/mydb"
`;
  }

  if (options.features.includes('email')) {
    env += `
# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="App <noreply@example.com>"
`;
  }

  if (options.features.includes('redis')) {
    env += `
# Redis
REDIS_URL=redis://localhost:6379
`;
  }

  return env;
}

function generateGitignore(): string {
  return `node_modules/
dist/
.env
.env.local
*.log
coverage/
.DS_Store
*.db
`;
}

function generateDockerfile(options: InitOptions): string {
  const isTS = options.language === 'typescript';

  return `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY ${isTS ? 'dist' : 'src'} ./${isTS ? 'dist' : 'src'}
${options.database !== 'none' && options.database !== 'mongodb' ? 'COPY prisma ./prisma\nRUN npx prisma generate' : ''}
EXPOSE 3000
CMD ["node", "${isTS ? 'dist' : 'src'}/index.js"]
`;
}

function generateDockerCompose(options: InitOptions): string {
  let compose = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "\${PORT:-3000}:3000"
    environment:
      - NODE_ENV=development
`;

  if (options.database === 'postgresql') {
    compose += `      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/mydb
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mydb
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
`;
  } else if (options.database === 'mysql') {
    compose += `      - DATABASE_URL=mysql://root:root@mysql:3306/mydb
    depends_on:
      - mysql

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: mydb
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql

volumes:
  mysql-data:
`;
  } else if (options.database === 'mongodb') {
    compose += `      - MONGODB_URI=mongodb://mongodb:27017/mydb
    depends_on:
      - mongodb

  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_DATABASE: mydb
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db

volumes:
  mongodb-data:
`;
  }

  if (options.features.includes('redis')) {
    compose += `
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
`;
  }

  return compose;
}

function generatePrismaSchema(options: InitOptions): string {
  const provider = options.database === 'sqlite' ? 'sqlite' : options.database;

  return `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String
  name          String?
  role          String    @default("user")
  status        String    @default("active")
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("users")
}
`;
}

function generateEntryFile(options: InitOptions): string {
  const isTS = options.language === 'typescript';
  const isESM = options.moduleSystem === 'esm';
  const fileExt = isTS ? 'js' : isESM ? 'js' : 'cjs';

  if (isESM || isTS) {
    return `import 'dotenv/config';
import { createServer } from './core/server.${fileExt}';
import { logger } from './core/logger.${fileExt}';

async function main()${isTS ? ': Promise<void>' : ''} {
  const server = createServer();

  try {
    await server.start();
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

main();
`;
  } else {
    // CommonJS
    return `require('dotenv').config();
const { createServer } = require('./core/server.cjs');
const { logger } = require('./core/logger.cjs');

async function main() {
  const server = createServer();

  try {
    await server.start();
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

main();
`;
  }
}

function generateServerFile(options: InitOptions): string {
  const isTS = options.language === 'typescript';
  const isESM = options.moduleSystem === 'esm';
  const fileExt = isTS ? 'js' : isESM ? 'js' : 'cjs';

  const serverBody = `  const app = Fastify({ logger });

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // Graceful shutdown
  const signals${isTS ? ': NodeJS.Signals[]' : ''} = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(\`Received \${signal}, shutting down...\`);
      await app.close();
      process.exit(0);
    });
  });

  return {
    instance: app,
    start: async ()${isTS ? ': Promise<void>' : ''} => {
      const port = parseInt(process.env.PORT || '3000', 10);
      const host = process.env.HOST || '0.0.0.0';
      await app.listen({ port, host });
      logger.info(\`Server listening on \${host}:\${port}\`);
    },
  };
}`;

  if (isESM || isTS) {
    return `import Fastify from 'fastify';
${isTS ? "import type { FastifyInstance } from 'fastify';" : ''}
import { logger } from './logger.${fileExt}';

${isTS ? 'export function createServer(): { instance: FastifyInstance; start: () => Promise<void> }' : 'export function createServer()'} {
${serverBody}
`;
  } else {
    // CommonJS
    return `const Fastify = require('fastify');
const { logger } = require('./logger.cjs');

function createServer() {
${serverBody}

module.exports = { createServer };
`;
  }
}

function generateLoggerFile(options: InitOptions): string {
  const isTS = options.language === 'typescript';
  const isESM = options.moduleSystem === 'esm';

  const loggerBody = `pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true },
  } : undefined,
})`;

  if (isESM || isTS) {
    return `import pino from 'pino';
${isTS ? "import type { Logger } from 'pino';" : ''}

export const logger${isTS ? ': Logger' : ''} = ${loggerBody};
`;
  } else {
    // CommonJS
    return `const pino = require('pino');

const logger = ${loggerBody};

module.exports = { logger };
`;
  }
}

function generateMongooseConnection(options: InitOptions): string {
  const isTS = options.language === 'typescript';
  const isESM = options.moduleSystem === 'esm';
  const fileExt = isTS ? 'js' : isESM ? 'js' : 'cjs';

  const connectionBody = `const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydb';

async function connectDatabase()${isTS ? ': Promise<typeof mongoose>' : ''} {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    logger.info(\`MongoDB connected: \${conn.connection.host}\`);
    return conn;
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection failed');
    process.exit(1);
  }
}

async function disconnectDatabase()${isTS ? ': Promise<void>' : ''} {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error({ err: error }, 'MongoDB disconnect failed');
  }
}`;

  if (isESM || isTS) {
    return `import mongoose from 'mongoose';
import { logger } from '../core/logger.${fileExt}';

${connectionBody}

export { connectDatabase, disconnectDatabase, mongoose };
`;
  } else {
    // CommonJS
    return `const mongoose = require('mongoose');
const { logger } = require('../core/logger.cjs');

${connectionBody}

module.exports = { connectDatabase, disconnectDatabase, mongoose };
`;
  }
}

function generateMongooseUserModel(options: InitOptions): string {
  const isTS = options.language === 'typescript';
  const isESM = options.moduleSystem === 'esm';

  const schemaBody = `const userSchema = new Schema${isTS ? '<IUser>' : ''}({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  name: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error${isTS ? ': any' : ''}) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword${isTS ? ': string' : ''})${isTS ? ': Promise<boolean>' : ''} {
  return bcrypt.compare(candidatePassword, this.password);
};`;

  const tsInterface = isTS
    ? `
export interface IUser extends Document {
  email: string;
  password: string;
  name?: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}
`
    : '';

  if (isESM || isTS) {
    return `import mongoose${isTS ? ', { Schema, Document }' : ''} from 'mongoose';
import bcrypt from 'bcryptjs';
${!isTS ? 'const { Schema } = mongoose;' : ''}
${tsInterface}
${schemaBody}

export const User = mongoose.model${isTS ? '<IUser>' : ''}('User', userSchema);
`;
  } else {
    // CommonJS
    return `const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

${schemaBody}

const User = mongoose.model('User', userSchema);

module.exports = { User };
`;
  }
}

function generateConfigFile(options: InitOptions): string {
  const isTS = options.language === 'typescript';
  const isESM = options.moduleSystem === 'esm';

  const configBody = `{
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
}${isTS ? ' as const' : ''}`;

  if (isESM || isTS) {
    return `import 'dotenv/config';

export const config = ${configBody};
`;
  } else {
    // CommonJS
    return `require('dotenv').config();

const config = ${configBody};

module.exports = { config };
`;
  }
}

function generateMiddlewareFile(options: InitOptions): string {
  const isTS = options.language === 'typescript';
  const isESM = options.moduleSystem === 'esm';
  const fileExt = isTS ? 'js' : isESM ? 'js' : 'cjs';

  const middlewareBody = `/**
 * Error handler middleware
 */
function errorHandler(error${isTS ? ': Error' : ''}, request${isTS ? ': FastifyRequest' : ''}, reply${isTS ? ': FastifyReply' : ''})${isTS ? ': void' : ''} {
  logger.error({ err: error, url: request.url, method: request.method }, 'Request error');

  const statusCode = (error${isTS ? ' as any' : ''}).statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : error.message;

  reply.status(statusCode).send({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}

/**
 * Request logging middleware
 */
function requestLogger(request${isTS ? ': FastifyRequest' : ''}, reply${isTS ? ': FastifyReply' : ''}, done${isTS ? ': () => void' : ''})${isTS ? ': void' : ''} {
  logger.info({ url: request.url, method: request.method, ip: request.ip }, 'Incoming request');
  done();
}`;

  if (isESM || isTS) {
    return `${isTS ? "import type { FastifyRequest, FastifyReply } from 'fastify';" : ''}
import { logger } from '../core/logger.${fileExt}';

${middlewareBody}

export { errorHandler, requestLogger };
`;
  } else {
    // CommonJS
    return `const { logger } = require('../core/logger.cjs');

${middlewareBody}

module.exports = { errorHandler, requestLogger };
`;
  }
}

function generateUtilsFile(options: InitOptions): string {
  const isTS = options.language === 'typescript';
  const isESM = options.moduleSystem === 'esm';

  const utilsBody = `/**
 * Standard API response helper
 */
function apiResponse${isTS ? '<T>' : ''}(data${isTS ? ': T' : ''}, message = "Success")${isTS ? ': { success: boolean; message: string; data: T }' : ''} {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Error response helper
 */
function errorResponse(message${isTS ? ': string' : ''}, code${isTS ? '?: string' : ''})${isTS ? ': { success: boolean; error: string; code?: string }' : ''} {
  return {
    success: false,
    error: message,
    ...(code && { code }),
  };
}

/**
 * Pagination helper
 */
function paginate${isTS ? '<T>' : ''}(data${isTS ? ': T[]' : ''}, page${isTS ? ': number' : ''}, limit${isTS ? ': number' : ''}, total${isTS ? ': number' : ''})${isTS ? ': PaginationResult<T>' : ''} {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}`;

  const tsInterface = isTS
    ? `
/**
 * Pagination result type
 */
export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
`
    : '';

  if (isESM || isTS) {
    return `${tsInterface}
${utilsBody}

export { apiResponse, errorResponse, paginate };
`;
  } else {
    // CommonJS
    return `${utilsBody}

module.exports = { apiResponse, errorResponse, paginate };
`;
  }
}

function generateTypesFile(options: InitOptions): string {
  if (options.language !== 'typescript') {
    return '// Types file - not needed for JavaScript\n';
  }

  return `/**
 * Common type definitions
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface RequestUser {
  id: string;
  email: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: RequestUser;
  }
}
`;
}
