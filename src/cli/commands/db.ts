import { Command } from 'commander';
import { execSync, spawn } from 'child_process';
import ora from 'ora';
import chalk from 'chalk';
import { error, info } from '../utils/helpers.js';

export const dbCommand = new Command('db').description('Database management commands');

dbCommand
  .command('migrate')
  .description('Run database migrations')
  .option('-n, --name <name>', 'Migration name')
  .action(async (options) => {
    const spinner = ora('Running migrations...').start();

    try {
      const cmd = options.name
        ? `npx prisma migrate dev --name ${options.name}`
        : 'npx prisma migrate dev';

      execSync(cmd, { stdio: 'inherit' });
      spinner.succeed('Migrations completed!');
    } catch (err) {
      spinner.fail('Migration failed');
      error(err instanceof Error ? err.message : String(err));
    }
  });

dbCommand
  .command('push')
  .description('Push schema changes to database (no migration)')
  .action(async () => {
    const spinner = ora('Pushing schema...').start();

    try {
      execSync('npx prisma db push', { stdio: 'inherit' });
      spinner.succeed('Schema pushed successfully!');
    } catch (err) {
      spinner.fail('Push failed');
      error(err instanceof Error ? err.message : String(err));
    }
  });

dbCommand
  .command('generate')
  .description('Generate Prisma client')
  .action(async () => {
    const spinner = ora('Generating Prisma client...').start();

    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      spinner.succeed('Prisma client generated!');
    } catch (err) {
      spinner.fail('Generation failed');
      error(err instanceof Error ? err.message : String(err));
    }
  });

dbCommand
  .command('studio')
  .description('Open Prisma Studio')
  .action(async () => {
    info('Opening Prisma Studio...');
    const studio = spawn('npx', ['prisma', 'studio'], {
      stdio: 'inherit',
      shell: true,
    });

    studio.on('close', (code) => {
      if (code !== 0) {
        error('Prisma Studio closed with error');
      }
    });
  });

dbCommand
  .command('seed')
  .description('Run database seed')
  .action(async () => {
    const spinner = ora('Seeding database...').start();

    try {
      execSync('npx prisma db seed', { stdio: 'inherit' });
      spinner.succeed('Database seeded!');
    } catch (err) {
      spinner.fail('Seeding failed');
      error(err instanceof Error ? err.message : String(err));
    }
  });

dbCommand
  .command('reset')
  .description('Reset database (drop all data and re-run migrations)')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options) => {
    if (!options.force) {
      console.log(chalk.yellow('\n⚠️  WARNING: This will delete all data in your database!\n'));

      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question('Are you sure you want to continue? (y/N) ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        info('Operation cancelled');
        return;
      }
    }

    const spinner = ora('Resetting database...').start();

    try {
      execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
      spinner.succeed('Database reset completed!');
    } catch (err) {
      spinner.fail('Reset failed');
      error(err instanceof Error ? err.message : String(err));
    }
  });

dbCommand
  .command('status')
  .description('Show migration status')
  .action(async () => {
    try {
      execSync('npx prisma migrate status', { stdio: 'inherit' });
    } catch {
      error('Failed to get migration status');
    }
  });
