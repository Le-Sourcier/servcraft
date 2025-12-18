import { Command } from 'commander';
import path from 'path';
import fs from 'fs/promises';
import ora from 'ora';
import chalk from 'chalk';
import { ensureDir, writeFile, fileExists, success, error, info, warn, getModulesDir, getSourceDir } from '../utils/helpers.js';

// Pre-built modules that can be added
const AVAILABLE_MODULES = {
  auth: {
    name: 'Authentication',
    description: 'JWT authentication with access/refresh tokens',
    files: ['auth.service', 'auth.controller', 'auth.routes', 'auth.middleware', 'auth.schemas', 'auth.types', 'index'],
  },
  users: {
    name: 'User Management',
    description: 'User CRUD with RBAC (roles & permissions)',
    files: ['user.service', 'user.controller', 'user.repository', 'user.routes', 'user.schemas', 'user.types', 'index'],
  },
  email: {
    name: 'Email Service',
    description: 'SMTP email with templates (Handlebars)',
    files: ['email.service', 'email.templates', 'email.types', 'index'],
  },
  audit: {
    name: 'Audit Logs',
    description: 'Activity logging and audit trail',
    files: ['audit.service', 'audit.types', 'index'],
  },
  upload: {
    name: 'File Upload',
    description: 'File upload with local/S3 storage',
    files: ['upload.service', 'upload.controller', 'upload.routes', 'upload.types', 'index'],
  },
  cache: {
    name: 'Redis Cache',
    description: 'Redis caching service',
    files: ['cache.service', 'cache.types', 'index'],
  },
  notifications: {
    name: 'Notifications',
    description: 'In-app and push notifications',
    files: ['notification.service', 'notification.types', 'index'],
  },
  settings: {
    name: 'Settings',
    description: 'Application settings management',
    files: ['settings.service', 'settings.controller', 'settings.routes', 'settings.types', 'index'],
  },
};

export const addModuleCommand = new Command('add')
  .description('Add a pre-built module to your project')
  .argument('[module]', 'Module to add (auth, users, email, audit, upload, cache, notifications, settings)')
  .option('-l, --list', 'List available modules')
  .action(async (moduleName?: string, options?: { list?: boolean }) => {
    if (options?.list || !moduleName) {
      console.log(chalk.bold('\n📦 Available Modules:\n'));

      for (const [key, mod] of Object.entries(AVAILABLE_MODULES)) {
        console.log(`  ${chalk.cyan(key.padEnd(15))} ${mod.name}`);
        console.log(`  ${' '.repeat(15)} ${chalk.gray(mod.description)}\n`);
      }

      console.log(chalk.bold('Usage:'));
      console.log(`  ${chalk.yellow('servcraft add auth')}      Add authentication module`);
      console.log(`  ${chalk.yellow('servcraft add users')}     Add user management module`);
      console.log(`  ${chalk.yellow('servcraft add email')}     Add email service module\n`);
      return;
    }

    const module = AVAILABLE_MODULES[moduleName as keyof typeof AVAILABLE_MODULES];

    if (!module) {
      error(`Unknown module: ${moduleName}`);
      info('Run "servcraft add --list" to see available modules');
      return;
    }

    const spinner = ora(`Adding ${module.name} module...`).start();

    try {
      const moduleDir = path.join(getModulesDir(), moduleName);

      // Check if module already exists
      if (await fileExists(moduleDir)) {
        spinner.stop();
        warn(`Module "${moduleName}" already exists`);
        return;
      }

      await ensureDir(moduleDir);

      // Generate module files based on type
      switch (moduleName) {
        case 'auth':
          await generateAuthModule(moduleDir);
          break;
        case 'users':
          await generateUsersModule(moduleDir);
          break;
        case 'email':
          await generateEmailModule(moduleDir);
          break;
        case 'audit':
          await generateAuditModule(moduleDir);
          break;
        case 'upload':
          await generateUploadModule(moduleDir);
          break;
        case 'cache':
          await generateCacheModule(moduleDir);
          break;
        default:
          await generateGenericModule(moduleDir, moduleName);
      }

      spinner.succeed(`${module.name} module added successfully!`);

      console.log('\n📁 Files created:');
      module.files.forEach((f) => success(`  src/modules/${moduleName}/${f}.ts`));

      console.log('\n📌 Next steps:');
      info('  1. Register the module in your main app file');
      info('  2. Configure any required environment variables');
      info('  3. Run database migrations if needed');

    } catch (err) {
      spinner.fail('Failed to add module');
      error(err instanceof Error ? err.message : String(err));
    }
  });

async function generateAuthModule(dir: string): Promise<void> {
  // This would copy from templates or generate inline
  // For now, we'll create placeholder files
  const files = {
    'auth.types.ts': `export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}
`,
    'auth.schemas.ts': `import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
`,
    'index.ts': `export * from './auth.types.js';
export * from './auth.schemas.js';
// Export services, controllers, etc.
`,
  };

  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(dir, name), content);
  }
}

async function generateUsersModule(dir: string): Promise<void> {
  const files = {
    'user.types.ts': `export type UserStatus = 'active' | 'inactive' | 'suspended' | 'banned';
export type UserRole = 'user' | 'admin' | 'moderator' | 'super_admin';

export interface User {
  id: string;
  email: string;
  password: string;
  name?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}
`,
    'user.schemas.ts': `import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).optional(),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  role: z.enum(['user', 'admin', 'moderator', 'super_admin']).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'banned']).optional(),
});
`,
    'index.ts': `export * from './user.types.js';
export * from './user.schemas.js';
`,
  };

  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(dir, name), content);
  }
}

async function generateEmailModule(dir: string): Promise<void> {
  const files = {
    'email.types.ts': `export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  data?: Record<string, unknown>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
`,
    'email.service.ts': `import nodemailer from 'nodemailer';
import type { EmailOptions, EmailResult } from './email.types.js';

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const result = await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        ...options,
      });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

export const emailService = new EmailService();
`,
    'index.ts': `export * from './email.types.js';
export { EmailService, emailService } from './email.service.js';
`,
  };

  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(dir, name), content);
  }
}

async function generateAuditModule(dir: string): Promise<void> {
  const files = {
    'audit.types.ts': `export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
`,
    'audit.service.ts': `import type { AuditLogEntry } from './audit.types.js';

const logs: AuditLogEntry[] = [];

export class AuditService {
  async log(entry: Omit<AuditLogEntry, 'createdAt'>): Promise<void> {
    logs.push({ ...entry, createdAt: new Date() });
    console.log('[AUDIT]', entry.action, entry.resource);
  }

  async query(filters: Partial<AuditLogEntry>): Promise<AuditLogEntry[]> {
    return logs.filter((log) => {
      for (const [key, value] of Object.entries(filters)) {
        if (log[key as keyof AuditLogEntry] !== value) return false;
      }
      return true;
    });
  }
}

export const auditService = new AuditService();
`,
    'index.ts': `export * from './audit.types.js';
export { AuditService, auditService } from './audit.service.js';
`,
  };

  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(dir, name), content);
  }
}

async function generateUploadModule(dir: string): Promise<void> {
  const files = {
    'upload.types.ts': `export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  createdAt: Date;
}

export interface UploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  destination?: string;
}
`,
    'index.ts': `export * from './upload.types.js';
`,
  };

  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(dir, name), content);
  }
}

async function generateCacheModule(dir: string): Promise<void> {
  const files = {
    'cache.types.ts': `export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}
`,
    'cache.service.ts': `import type { CacheOptions } from './cache.types.js';

// In-memory cache (replace with Redis in production)
const cache = new Map<string, { value: unknown; expiry: number }>();

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set(key: string, value: unknown, ttl = 3600): Promise<void> {
    cache.set(key, { value, expiry: Date.now() + ttl * 1000 });
  }

  async del(key: string): Promise<void> {
    cache.delete(key);
  }

  async clear(): Promise<void> {
    cache.clear();
  }
}

export const cacheService = new CacheService();
`,
    'index.ts': `export * from './cache.types.js';
export { CacheService, cacheService } from './cache.service.js';
`,
  };

  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(dir, name), content);
  }
}

async function generateGenericModule(dir: string, name: string): Promise<void> {
  const files = {
    [`${name}.types.ts`]: `// ${name} types
export interface ${name.charAt(0).toUpperCase() + name.slice(1)}Data {
  // Define your types here
}
`,
    'index.ts': `export * from './${name}.types.js';
`,
  };

  for (const [fileName, content] of Object.entries(files)) {
    await writeFile(path.join(dir, fileName), content);
  }
}
