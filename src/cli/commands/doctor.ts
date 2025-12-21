/* eslint-disable no-console */
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';

interface Check {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  suggestion?: string;
}

async function checkNodeVersion(): Promise<Check> {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);

  if (major >= 18) {
    return { name: 'Node.js', status: 'pass', message: `${version} ✓` };
  }
  return {
    name: 'Node.js',
    status: 'fail',
    message: `${version} (< 18)`,
    suggestion: 'Upgrade to Node.js 18+',
  };
}

async function checkPackageJson(): Promise<Check[]> {
  const checks: Check[] = [];
  try {
    const content = await fs.readFile('package.json', 'utf-8');
    const pkg = JSON.parse(content);

    checks.push({ name: 'package.json', status: 'pass', message: 'Found' });

    if (pkg.dependencies?.fastify) {
      checks.push({ name: 'Fastify', status: 'pass', message: 'Installed' });
    } else {
      checks.push({
        name: 'Fastify',
        status: 'fail',
        message: 'Missing',
        suggestion: 'npm install fastify',
      });
    }
  } catch {
    checks.push({
      name: 'package.json',
      status: 'fail',
      message: 'Not found',
      suggestion: 'Run servcraft init',
    });
  }
  return checks;
}

async function checkDirectories(): Promise<Check[]> {
  const checks: Check[] = [];
  const dirs = ['src', 'node_modules', '.git', '.env'];

  for (const dir of dirs) {
    try {
      await fs.access(dir);
      checks.push({ name: dir, status: 'pass', message: 'Exists' });
    } catch {
      const isCritical = dir === 'src' || dir === 'node_modules';
      checks.push({
        name: dir,
        status: isCritical ? 'fail' : 'warn',
        message: 'Not found',
        suggestion:
          dir === 'node_modules' ? 'npm install' : dir === '.env' ? 'Create .env file' : undefined,
      });
    }
  }
  return checks;
}

export const doctorCommand = new Command('doctor')
  .description('Diagnose project configuration and dependencies')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🔍 ServCraft Doctor\n'));

    const allChecks: Check[] = [];

    allChecks.push(await checkNodeVersion());
    allChecks.push(...(await checkPackageJson()));
    allChecks.push(...(await checkDirectories()));

    // Display results
    allChecks.forEach((check) => {
      const icon =
        check.status === 'pass'
          ? chalk.green('✓')
          : check.status === 'warn'
            ? chalk.yellow('⚠')
            : chalk.red('✗');
      const color =
        check.status === 'pass' ? chalk.green : check.status === 'warn' ? chalk.yellow : chalk.red;

      console.log(`${icon} ${check.name.padEnd(20)} ${color(check.message)}`);
      if (check.suggestion) {
        console.log(chalk.gray(`   → ${check.suggestion}`));
      }
    });

    const pass = allChecks.filter((c) => c.status === 'pass').length;
    const warn = allChecks.filter((c) => c.status === 'warn').length;
    const fail = allChecks.filter((c) => c.status === 'fail').length;

    console.log(chalk.gray('\n' + '─'.repeat(60)));
    console.log(
      `\n${chalk.green(pass + ' passed')} | ${chalk.yellow(warn + ' warnings')} | ${chalk.red(fail + ' failed')}\n`
    );

    if (fail === 0 && warn === 0) {
      console.log(chalk.green.bold('✨ Everything looks good!\n'));
    } else if (fail > 0) {
      console.log(chalk.red.bold('✗ Fix critical issues before using ServCraft.\n'));
    } else {
      console.log(chalk.yellow.bold('⚠ Some warnings, but should work.\n'));
    }
  });
