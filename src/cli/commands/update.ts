/* eslint-disable no-console */
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import { getProjectRoot, getModulesDir } from '../utils/helpers.js';
import { validateProject, displayError } from '../utils/error-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get list of available modules (same as list.ts)
const AVAILABLE_MODULES = [
  'auth',
  'users',
  'email',
  'mfa',
  'oauth',
  'rate-limit',
  'cache',
  'upload',
  'search',
  'notification',
  'webhook',
  'websocket',
  'queue',
  'payment',
  'i18n',
  'feature-flag',
  'analytics',
  'media-processing',
  'api-versioning',
  'audit',
  'swagger',
  'validation',
];

async function getInstalledModules(): Promise<string[]> {
  try {
    const modulesDir = getModulesDir();

    const entries = await fs.readdir(modulesDir, { withFileTypes: true });
    const installedModules = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => AVAILABLE_MODULES.includes(name));

    return installedModules;
  } catch {
    return [];
  }
}

async function copyModuleFiles(moduleName: string, _projectRoot: string): Promise<void> {
  const cliRoot = path.resolve(__dirname, '../../../');
  const sourceModulePath = path.join(cliRoot, 'src', 'modules', moduleName);
  const targetModulesDir = getModulesDir();
  const targetModulePath = path.join(targetModulesDir, moduleName);

  // Check if source module exists
  try {
    await fs.access(sourceModulePath);
  } catch {
    throw new Error(`Module source not found: ${moduleName}`);
  }

  // Copy module files
  await fs.cp(sourceModulePath, targetModulePath, { recursive: true });
}

async function updateModule(moduleName: string, options: { check?: boolean }): Promise<void> {
  const projectError = validateProject();
  if (projectError) {
    displayError(projectError);
    return;
  }

  const projectRoot = getProjectRoot();
  const installedModules = await getInstalledModules();

  if (!installedModules.includes(moduleName)) {
    console.log(chalk.yellow(`\n⚠ Module "${moduleName}" is not installed\n`));
    console.log(
      chalk.gray(`Run ${chalk.cyan(`servcraft add ${moduleName}`)} to install it first.\n`)
    );
    return;
  }

  if (options.check) {
    console.log(chalk.cyan(`\n📦 Checking updates for "${moduleName}"...\n`));
    console.log(chalk.gray('Note: Version tracking will be implemented in a future release.'));
    console.log(chalk.gray('Currently, update will always reinstall the latest version.\n'));
    return;
  }

  // Confirm update
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: `Update "${moduleName}" module? This will overwrite existing files.`,
      default: false,
    },
  ]);

  if (!confirmed) {
    console.log(chalk.yellow('\n⚠ Update cancelled\n'));
    return;
  }

  console.log(chalk.cyan(`\n🔄 Updating "${moduleName}" module...\n`));

  try {
    await copyModuleFiles(moduleName, projectRoot);
    console.log(chalk.green(`✔ Module "${moduleName}" updated successfully!\n`));
    console.log(
      chalk.gray('Note: Remember to review any breaking changes in the documentation.\n')
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`\n✗ Failed to update module: ${error.message}\n`));
    }
  }
}

async function updateAllModules(options: { check?: boolean }): Promise<void> {
  const projectError = validateProject();
  if (projectError) {
    displayError(projectError);
    return;
  }

  const installedModules = await getInstalledModules();

  if (installedModules.length === 0) {
    console.log(chalk.yellow('\n⚠ No modules installed\n'));
    console.log(chalk.gray(`Run ${chalk.cyan('servcraft list')} to see available modules.\n`));
    return;
  }

  if (options.check) {
    console.log(chalk.cyan('\n📦 Checking updates for all modules...\n'));
    console.log(chalk.bold('Installed modules:'));
    installedModules.forEach((mod) => {
      console.log(`  • ${chalk.cyan(mod)}`);
    });
    console.log();
    console.log(chalk.gray('Note: Version tracking will be implemented in a future release.'));
    console.log(chalk.gray('Currently, update will always reinstall the latest version.\n'));
    return;
  }

  console.log(chalk.cyan(`\n📦 Found ${installedModules.length} installed module(s):\n`));
  installedModules.forEach((mod) => {
    console.log(`  • ${chalk.cyan(mod)}`);
  });
  console.log();

  // Confirm update all
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Update all modules? This will overwrite existing files.',
      default: false,
    },
  ]);

  if (!confirmed) {
    console.log(chalk.yellow('\n⚠ Update cancelled\n'));
    return;
  }

  console.log(chalk.cyan('\n🔄 Updating all modules...\n'));

  const projectRoot = getProjectRoot();
  let successCount = 0;
  let failCount = 0;

  for (const moduleName of installedModules) {
    try {
      await copyModuleFiles(moduleName, projectRoot);
      console.log(chalk.green(`✔ Updated: ${moduleName}`));
      successCount++;
    } catch {
      console.error(chalk.red(`✗ Failed: ${moduleName}`));
      failCount++;
    }
  }

  console.log();
  console.log(
    chalk.bold(
      `\n✔ Update complete: ${chalk.green(successCount)} succeeded, ${chalk.red(failCount)} failed\n`
    )
  );

  if (successCount > 0) {
    console.log(
      chalk.gray('Note: Remember to review any breaking changes in the documentation.\n')
    );
  }
}

export const updateCommand = new Command('update')
  .description('Update installed modules to latest version')
  .argument('[module]', 'Specific module to update')
  .option('--check', 'Check for updates without applying')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (moduleName?: string, options?: { check?: boolean; yes?: boolean }) => {
    // If --yes flag is provided, we'll handle it by auto-confirming in the inquirer prompts
    // For now, we'll just pass through to the update functions

    if (moduleName) {
      await updateModule(moduleName, { check: options?.check });
    } else {
      await updateAllModules({ check: options?.check });
    }
  });
