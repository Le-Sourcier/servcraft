/* eslint-disable no-console */
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import { getProjectRoot, getModulesDir } from '../utils/helpers.js';

// Pre-built modules that can be added
const AVAILABLE_MODULES: Record<string, { name: string; description: string; category: string }> = {
  // Core
  auth: {
    name: 'Authentication',
    description: 'JWT authentication with access/refresh tokens',
    category: 'Core',
  },
  users: {
    name: 'User Management',
    description: 'User CRUD with RBAC (roles & permissions)',
    category: 'Core',
  },
  email: {
    name: 'Email Service',
    description: 'SMTP email with templates (Handlebars)',
    category: 'Core',
  },

  // Security
  mfa: {
    name: 'MFA/TOTP',
    description: 'Two-factor authentication with QR codes',
    category: 'Security',
  },
  oauth: {
    name: 'OAuth',
    description: 'Social login (Google, GitHub, Facebook, Twitter, Apple)',
    category: 'Security',
  },
  'rate-limit': {
    name: 'Rate Limiting',
    description: 'Advanced rate limiting with multiple algorithms',
    category: 'Security',
  },

  // Data & Storage
  cache: {
    name: 'Redis Cache',
    description: 'Redis caching with TTL & invalidation',
    category: 'Data & Storage',
  },
  upload: {
    name: 'File Upload',
    description: 'File upload with local/S3/Cloudinary storage',
    category: 'Data & Storage',
  },
  search: {
    name: 'Search',
    description: 'Full-text search with Elasticsearch/Meilisearch',
    category: 'Data & Storage',
  },

  // Communication
  notification: {
    name: 'Notifications',
    description: 'Email, SMS, Push notifications',
    category: 'Communication',
  },
  webhook: {
    name: 'Webhooks',
    description: 'Outgoing webhooks with HMAC signatures & retry',
    category: 'Communication',
  },
  websocket: {
    name: 'WebSockets',
    description: 'Real-time communication with Socket.io',
    category: 'Communication',
  },

  // Background Processing
  queue: {
    name: 'Queue/Jobs',
    description: 'Background jobs with Bull/BullMQ & cron scheduling',
    category: 'Background Processing',
  },
  'media-processing': {
    name: 'Media Processing',
    description: 'Image/video processing with FFmpeg',
    category: 'Background Processing',
  },

  // Monitoring & Analytics
  audit: {
    name: 'Audit Logs',
    description: 'Activity logging and audit trail',
    category: 'Monitoring & Analytics',
  },
  analytics: {
    name: 'Analytics/Metrics',
    description: 'Prometheus metrics & event tracking',
    category: 'Monitoring & Analytics',
  },

  // Internationalization
  i18n: {
    name: 'i18n/Localization',
    description: 'Multi-language support with 7+ locales',
    category: 'Internationalization',
  },

  // API Management
  'feature-flag': {
    name: 'Feature Flags',
    description: 'A/B testing & progressive rollout',
    category: 'API Management',
  },
  'api-versioning': {
    name: 'API Versioning',
    description: 'Multiple API versions support',
    category: 'API Management',
  },

  // Payments
  payment: {
    name: 'Payments',
    description: 'Payment processing (Stripe, PayPal, Mobile Money)',
    category: 'Payments',
  },
};

async function getInstalledModules(): Promise<string[]> {
  try {
    const modulesDir = getModulesDir();
    const entries = await fs.readdir(modulesDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

function isServercraftProject(): boolean {
  try {
    getProjectRoot();
    return true;
  } catch {
    return false;
  }
}

export const listCommand = new Command('list')
  .alias('ls')
  .description('List available and installed modules')
  .option('-a, --available', 'Show only available modules')
  .option('-i, --installed', 'Show only installed modules')
  .option('-c, --category <category>', 'Filter by category')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      available?: boolean;
      installed?: boolean;
      category?: string;
      json?: boolean;
    }) => {
      const installedModules = await getInstalledModules();
      const isProject = isServercraftProject();

      if (options.json) {
        const output: Record<string, unknown> = {
          available: Object.entries(AVAILABLE_MODULES).map(([key, mod]) => ({
            id: key,
            ...mod,
            installed: installedModules.includes(key),
          })),
        };

        if (isProject) {
          output.installed = installedModules;
        }

        console.log(JSON.stringify(output, null, 2));
        return;
      }

      // Group modules by category
      const byCategory: Record<
        string,
        Array<{ id: string; name: string; description: string; installed: boolean }>
      > = {};

      for (const [key, mod] of Object.entries(AVAILABLE_MODULES)) {
        if (options.category && mod.category.toLowerCase() !== options.category.toLowerCase()) {
          continue;
        }

        if (!byCategory[mod.category]) {
          byCategory[mod.category] = [];
        }

        byCategory[mod.category]?.push({
          id: key,
          name: mod.name,
          description: mod.description,
          installed: installedModules.includes(key),
        });
      }

      // Show installed modules only
      if (options.installed) {
        if (!isProject) {
          console.log(chalk.yellow('\n⚠ Not in a Servcraft project directory\n'));
          return;
        }

        console.log(chalk.bold('\n📦 Installed Modules:\n'));

        if (installedModules.length === 0) {
          console.log(chalk.gray('  No modules installed yet.\n'));
          console.log(`  Run ${chalk.cyan('servcraft add <module>')} to add a module.\n`);
          return;
        }

        for (const modId of installedModules) {
          const mod = AVAILABLE_MODULES[modId];
          if (mod) {
            console.log(`  ${chalk.green('✓')} ${chalk.cyan(modId.padEnd(18))} ${mod.name}`);
          } else {
            console.log(
              `  ${chalk.green('✓')} ${chalk.cyan(modId.padEnd(18))} ${chalk.gray('(custom module)')}`
            );
          }
        }

        console.log(`\n  Total: ${chalk.bold(installedModules.length)} module(s) installed\n`);
        return;
      }

      // Show available modules (default or --available)
      console.log(chalk.bold('\n📦 Available Modules\n'));

      if (isProject) {
        console.log(
          chalk.gray(`  ${chalk.green('✓')} = installed    ${chalk.dim('○')} = not installed\n`)
        );
      }

      for (const [category, modules] of Object.entries(byCategory)) {
        console.log(chalk.bold.blue(`  ${category}`));
        console.log(chalk.gray('  ' + '─'.repeat(40)));

        for (const mod of modules) {
          const status = isProject ? (mod.installed ? chalk.green('✓') : chalk.dim('○')) : ' ';
          const nameColor = mod.installed ? chalk.green : chalk.cyan;
          console.log(`  ${status} ${nameColor(mod.id.padEnd(18))} ${mod.name}`);
          console.log(`    ${chalk.gray(mod.description)}`);
        }
        console.log();
      }

      // Summary
      const totalAvailable = Object.keys(AVAILABLE_MODULES).length;
      const totalInstalled = installedModules.filter((m) => AVAILABLE_MODULES[m]).length;

      console.log(chalk.gray('─'.repeat(50)));
      console.log(
        `  ${chalk.bold(totalAvailable)} modules available` +
          (isProject ? ` | ${chalk.green.bold(totalInstalled)} installed` : '')
      );
      console.log();

      // Usage hints
      console.log(chalk.bold('  Usage:'));
      console.log(`    ${chalk.yellow('servcraft add <module>')}      Add a module`);
      console.log(`    ${chalk.yellow('servcraft list --installed')}  Show installed only`);
      console.log(`    ${chalk.yellow('servcraft list --category Security')}  Filter by category`);
      console.log();
    }
  );
