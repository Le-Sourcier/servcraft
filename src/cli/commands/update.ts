import { Command } from 'commander';
import chalk from 'chalk';

export const updateCommand = new Command('update')
  .description('Update installed modules to latest version')
  .argument('[module]', 'Specific module to update')
  .option('--check', 'Check for updates without applying')
  .action(async () => {
    console.log(chalk.bold.cyan('\nServCraft Update - Coming in v0.2.1!\n'));
  });
