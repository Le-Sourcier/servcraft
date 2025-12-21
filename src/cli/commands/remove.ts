/* eslint-disable no-console */
import { Command } from 'commander';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs/promises';
import inquirer from 'inquirer';
import { getModulesDir, success, error, info } from '../utils/helpers.js';
import { ServCraftError, displayError, validateProject } from '../utils/error-handler.js';

export const removeCommand = new Command('remove')
  .alias('rm')
  .description('Remove an installed module from your project')
  .argument('<module>', 'Module to remove')
  .option('-y, --yes', 'Skip confirmation prompt')
  .option('--keep-env', 'Keep environment variables')
  .action(async (moduleName: string, options?: { yes?: boolean; keepEnv?: boolean }) => {
    // Validate project
    const projectError = validateProject();
    if (projectError) {
      displayError(projectError);
      return;
    }

    console.log(chalk.bold.cyan('\n🗑️  ServCraft Module Removal\n'));

    const moduleDir = path.join(getModulesDir(), moduleName);

    try {
      // Check if module exists
      const exists = await fs
        .access(moduleDir)
        .then(() => true)
        .catch(() => false);

      if (!exists) {
        displayError(
          new ServCraftError(`Module "${moduleName}" is not installed`, [
            `Run ${chalk.cyan('servcraft list --installed')} to see installed modules`,
            `Check the spelling of the module name`,
          ])
        );
        return;
      }

      // Get list of files
      const files = await fs.readdir(moduleDir);
      const fileCount = files.length;

      // Confirm removal
      if (!options?.yes) {
        console.log(chalk.yellow(`⚠  This will remove the "${moduleName}" module:`));
        console.log(chalk.gray(`   Directory: ${moduleDir}`));
        console.log(chalk.gray(`   Files: ${fileCount} file(s)`));
        console.log();

        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to remove this module?',
            default: false,
          },
        ]);

        if (!confirm) {
          console.log(chalk.yellow('\n✖ Removal cancelled\n'));
          return;
        }
      }

      const spinner = ora('Removing module...').start();

      // Remove module directory
      await fs.rm(moduleDir, { recursive: true, force: true });

      spinner.succeed(`Module "${moduleName}" removed successfully!`);

      // Show what was removed
      console.log('\n' + chalk.bold('✓ Removed:'));
      success(`  src/modules/${moduleName}/ (${fileCount} files)`);

      // Instructions for cleanup
      if (!options?.keepEnv) {
        console.log('\n' + chalk.bold('📌 Manual cleanup needed:'));
        info('  1. Remove environment variables related to this module from .env');
        info('  2. Remove module imports from your main app file');
        info('  3. Remove related database migrations if any');
        info('  4. Update your routes if they reference this module');
      } else {
        console.log('\n' + chalk.bold('📌 Manual cleanup needed:'));
        info('  1. Environment variables were kept (--keep-env flag)');
        info('  2. Remove module imports from your main app file');
        info('  3. Update your routes if they reference this module');
      }

      console.log();
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      console.log();
    }
  });
