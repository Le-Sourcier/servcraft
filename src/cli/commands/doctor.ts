import { Command } from 'commander';
import chalk from 'chalk';

export const doctorCommand = new Command('doctor')
  .description('Diagnose project configuration and dependencies')
  .action(async () => {
    console.log(chalk.bold.cyan('\nServCraft Doctor - Coming soon!\n'));
  });
