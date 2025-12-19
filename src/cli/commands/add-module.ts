import { Command } from 'commander';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import {
  ensureDir,
  writeFile,
  fileExists,
  success,
  error,
  info,
  warn,
  getModulesDir,
} from '../utils/helpers.js';
import { EnvManager } from '../utils/env-manager.js';
import { TemplateManager } from '../utils/template-manager.js';
import { InteractivePrompt } from '../utils/interactive-prompt.js';

// Pre-built modules that can be added
const AVAILABLE_MODULES = {
  auth: {
    name: 'Authentication',
    description: 'JWT authentication with access/refresh tokens',
    files: [
      'auth.service',
      'auth.controller',
      'auth.routes',
      'auth.middleware',
      'auth.schemas',
      'auth.types',
      'index',
    ],
  },
  users: {
    name: 'User Management',
    description: 'User CRUD with RBAC (roles & permissions)',
    files: [
      'user.service',
      'user.controller',
      'user.repository',
      'user.routes',
      'user.schemas',
      'user.types',
      'index',
    ],
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
    files: [
      'settings.service',
      'settings.controller',
      'settings.routes',
      'settings.types',
      'index',
    ],
  },
};

export const addModuleCommand = new Command('add')
  .description('Add a pre-built module to your project')
  .argument(
    '[module]',
    'Module to add (auth, users, email, audit, upload, cache, notifications, settings)'
  )
  .option('-l, --list', 'List available modules')
  .option('-f, --force', 'Force overwrite existing module')
  .option('-u, --update', 'Update existing module (smart merge)')
  .option('--skip-existing', 'Skip if module already exists')
  .action(
    async (
      moduleName?: string,
      options?: { list?: boolean; force?: boolean; update?: boolean; skipExisting?: boolean }
    ) => {
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
        const templateManager = new TemplateManager(process.cwd());
        const moduleExists = await fileExists(moduleDir);

        // Handle existing module
        if (moduleExists) {
          spinner.stop();

          // Check flags
          if (options?.skipExisting) {
            info(`Module "${moduleName}" already exists, skipping...`);
            return;
          }

          // Check for modifications
          const modifiedFiles = await templateManager.getModifiedFiles(moduleName, moduleDir);
          const hasModifications = modifiedFiles.some((f) => f.isModified);

          let action: string;

          if (options?.force) {
            action = 'overwrite';
          } else if (options?.update) {
            action = 'update';
          } else {
            // Interactive prompt
            const choice = await InteractivePrompt.askModuleExists(moduleName, hasModifications);
            action = choice.action;
          }

          // Handle action
          if (action === 'skip') {
            info('Keeping existing module');
            return;
          }

          if (action === 'diff') {
            // Show diff and ask again
            await showDiffForModule(templateManager, moduleName, moduleDir);
            return;
          }

          if (action === 'backup-overwrite' || action === 'overwrite') {
            if (action === 'backup-overwrite') {
              const backupPath = await templateManager.createBackup(moduleName, moduleDir);
              InteractivePrompt.showBackupCreated(backupPath);
            }

            // Remove existing module
            await fs.rm(moduleDir, { recursive: true, force: true });
            await ensureDir(moduleDir);

            // Generate fresh module
            await generateModuleFiles(moduleName, moduleDir);

            // Save templates and manifest
            const files = await getModuleFiles(moduleName, moduleDir);
            await templateManager.saveTemplate(moduleName, files);
            await templateManager.saveManifest(moduleName, files);

            spinner.succeed(
              `${module.name} module ${action === 'backup-overwrite' ? 'backed up and ' : ''}overwritten!`
            );
          } else if (action === 'update') {
            // Smart merge
            await performSmartMerge(templateManager, moduleName, moduleDir, module.name);
          }
        } else {
          // Fresh installation
          await ensureDir(moduleDir);

          // Generate module files
          await generateModuleFiles(moduleName, moduleDir);

          // Save templates and manifest for future updates
          const files = await getModuleFiles(moduleName, moduleDir);
          await templateManager.saveTemplate(moduleName, files);
          await templateManager.saveManifest(moduleName, files);

          spinner.succeed(`${module.name} module added successfully!`);
        }

        if (!moduleExists || action === 'overwrite' || action === 'backup-overwrite') {
          console.log('\n📁 Files created:');
          module.files.forEach((f) => success(`  src/modules/${moduleName}/${f}.ts`));
        }

        // Update .env file with module-specific variables
        const envManager = new EnvManager(process.cwd());
        const envSections = EnvManager.getModuleEnvVariables(moduleName);

        if (envSections.length > 0) {
          const envSpinner = ora('Updating environment variables...').start();
          try {
            const result = await envManager.addVariables(envSections);

            envSpinner.succeed('Environment variables updated!');

            if (result.created) {
              info('\n📝 Created new .env file');
            }

            if (result.added.length > 0) {
              console.log(chalk.bold('\n✅ Added to .env:'));
              result.added.forEach((key) => success(`  ${key}`));
            }

            if (result.skipped.length > 0) {
              console.log(chalk.bold('\n⏭️  Already in .env (skipped):'));
              result.skipped.forEach((key) => info(`  ${key}`));
            }

            // Show which variables need configuration
            const requiredVars = envSections
              .flatMap((section) => section.variables)
              .filter((v) => v.required && !v.value)
              .map((v) => v.key);

            if (requiredVars.length > 0) {
              console.log(chalk.bold('\n⚠️  Required configuration:'));
              requiredVars.forEach((key) => warn(`  ${key} - Please configure this variable`));
            }
          } catch (err) {
            envSpinner.fail('Failed to update environment variables');
            error(err instanceof Error ? err.message : String(err));
          }
        }

        console.log('\n📌 Next steps:');
        info('  1. Configure environment variables in .env (if needed)');
        info('  2. Register the module in your main app file');
        info('  3. Run database migrations if needed');
      } catch (err) {
        spinner.fail('Failed to add module');
        error(err instanceof Error ? err.message : String(err));
      }
    }
  );

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

/**
 * Helper: Generate module files based on type
 */
async function generateModuleFiles(moduleName: string, moduleDir: string): Promise<void> {
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
}

/**
 * Helper: Get all module files as Record<filename, content>
 */
async function getModuleFiles(
  moduleName: string,
  moduleDir: string
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  const entries = await fs.readdir(moduleDir);

  for (const entry of entries) {
    const filePath = path.join(moduleDir, entry);
    const stat = await fs.stat(filePath);

    if (stat.isFile() && entry.endsWith('.ts')) {
      const content = await fs.readFile(filePath, 'utf-8');
      files[entry] = content;
    }
  }

  return files;
}

/**
 * Helper: Show diff for entire module
 */
async function showDiffForModule(
  templateManager: TemplateManager,
  moduleName: string,
  moduleDir: string
): Promise<void> {
  const modifiedFiles = await templateManager.getModifiedFiles(moduleName, moduleDir);

  console.log(chalk.cyan(`\n📊 Changes in module "${moduleName}":\n`));

  for (const file of modifiedFiles) {
    if (file.isModified) {
      console.log(chalk.yellow(`\n📄 ${file.fileName}:`));

      const currentPath = path.join(moduleDir, file.fileName);
      const currentContent = await fs.readFile(currentPath, 'utf-8');
      const originalContent = await templateManager.getTemplate(moduleName, file.fileName);

      if (originalContent) {
        const diff = templateManager.generateDiff(originalContent, currentContent);
        console.log(diff);
      }
    }
  }
}

/**
 * Helper: Perform smart merge
 */
async function performSmartMerge(
  templateManager: TemplateManager,
  moduleName: string,
  moduleDir: string,
  _displayName: string
): Promise<void> {
  const spinner = ora('Analyzing files for merge...').start();

  // Get new template files
  const newFiles: Record<string, string> = {};
  const templateDir = path.join(templateManager['templatesDir'], moduleName);

  try {
    const entries = await fs.readdir(templateDir);
    for (const entry of entries) {
      const content = await fs.readFile(path.join(templateDir, entry), 'utf-8');
      newFiles[entry] = content;
    }
  } catch {
    spinner.fail('Could not find template files');
    return;
  }

  const modifiedFiles = await templateManager.getModifiedFiles(moduleName, moduleDir);
  spinner.stop();

  // Ask for batch action or individual
  const batchAction = await InteractivePrompt.askBatchAction();

  const stats = {
    merged: 0,
    kept: 0,
    overwritten: 0,
    conflicts: 0,
  };

  for (const fileInfo of modifiedFiles) {
    const fileName = fileInfo.fileName;
    const filePath = path.join(moduleDir, fileName);
    const newContent = newFiles[fileName];

    if (!newContent) {
      // File doesn't exist in new template, keep existing
      continue;
    }

    let fileAction: string;

    if (batchAction === 'merge-all') {
      fileAction = 'merge';
    } else if (batchAction === 'keep-all') {
      fileAction = 'keep';
    } else if (batchAction === 'overwrite-all') {
      fileAction = 'overwrite';
    } else {
      // Ask for each file
      const currentContent = await fs.readFile(filePath, 'utf-8');
      const yourLines = currentContent.split('\n').length;
      const newLines = newContent.split('\n').length;

      const choice = await InteractivePrompt.askFileAction(
        fileName,
        fileInfo.isModified,
        yourLines,
        newLines
      );
      fileAction = choice.action;

      if (fileAction === 'diff') {
        const originalContent = await templateManager.getTemplate(moduleName, fileName);
        if (originalContent) {
          const diff = templateManager.generateDiff(originalContent, currentContent);
          const proceed = await InteractivePrompt.showDiffAndAsk(diff);
          fileAction = proceed ? 'merge' : 'keep';
        }
      }
    }

    // Perform action
    if (fileAction === 'keep' || fileAction === 'skip') {
      stats.kept++;
      continue;
    }

    if (fileAction === 'overwrite') {
      await fs.writeFile(filePath, newContent, 'utf-8');
      stats.overwritten++;
      continue;
    }

    if (fileAction === 'merge') {
      const originalContent = await templateManager.getTemplate(moduleName, fileName);
      const currentContent = await fs.readFile(filePath, 'utf-8');

      if (originalContent) {
        const mergeResult = await templateManager.mergeFiles(
          originalContent,
          currentContent,
          newContent
        );

        await fs.writeFile(filePath, mergeResult.merged, 'utf-8');

        if (mergeResult.hasConflicts) {
          stats.conflicts++;
          InteractivePrompt.displayConflicts(mergeResult.conflicts);
        } else {
          stats.merged++;
        }
      } else {
        await fs.writeFile(filePath, newContent, 'utf-8');
        stats.overwritten++;
      }
    }
  }

  // Update manifest
  const files = await getModuleFiles(moduleName, moduleDir);
  await templateManager.updateManifest(moduleName, files);

  InteractivePrompt.showMergeSummary(stats);
}
