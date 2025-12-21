/* eslint-disable no-console */
import chalk from 'chalk';
import path from 'path';

export interface FileOperation {
  type: 'create' | 'modify' | 'delete';
  path: string;
  content?: string;
  size?: number;
}

export class DryRunManager {
  private static instance: DryRunManager;
  private enabled = false;
  private operations: FileOperation[] = [];

  private constructor() {}

  static getInstance(): DryRunManager {
    if (!DryRunManager.instance) {
      DryRunManager.instance = new DryRunManager();
    }
    return DryRunManager.instance;
  }

  enable(): void {
    this.enabled = true;
    this.operations = [];
  }

  disable(): void {
    this.enabled = false;
    this.operations = [];
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  addOperation(operation: FileOperation): void {
    if (this.enabled) {
      this.operations.push(operation);
    }
  }

  getOperations(): FileOperation[] {
    return [...this.operations];
  }

  printSummary(): void {
    if (!this.enabled || this.operations.length === 0) {
      return;
    }

    console.log(chalk.bold.yellow('\n📋 Dry Run - Preview of changes:\n'));
    console.log(chalk.gray('No files will be written. Remove --dry-run to apply changes.\n'));

    const createOps = this.operations.filter((op) => op.type === 'create');
    const modifyOps = this.operations.filter((op) => op.type === 'modify');
    const deleteOps = this.operations.filter((op) => op.type === 'delete');

    if (createOps.length > 0) {
      console.log(chalk.green.bold(`\n✓ Files to be created (${createOps.length}):`));
      createOps.forEach((op) => {
        const size = op.content ? `${op.content.length} bytes` : 'unknown size';
        console.log(`  ${chalk.green('+')} ${chalk.cyan(op.path)} ${chalk.gray(`(${size})`)}`);
      });
    }

    if (modifyOps.length > 0) {
      console.log(chalk.yellow.bold(`\n~ Files to be modified (${modifyOps.length}):`));
      modifyOps.forEach((op) => {
        console.log(`  ${chalk.yellow('~')} ${chalk.cyan(op.path)}`);
      });
    }

    if (deleteOps.length > 0) {
      console.log(chalk.red.bold(`\n- Files to be deleted (${deleteOps.length}):`));
      deleteOps.forEach((op) => {
        console.log(`  ${chalk.red('-')} ${chalk.cyan(op.path)}`);
      });
    }

    console.log(chalk.gray('\n' + '─'.repeat(60)));
    console.log(
      chalk.bold(`  Total operations: ${this.operations.length}`) +
        chalk.gray(
          ` (${createOps.length} create, ${modifyOps.length} modify, ${deleteOps.length} delete)`
        )
    );
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.yellow('\n⚠ This was a dry run. No files were created or modified.'));
    console.log(chalk.gray('  Remove --dry-run to apply these changes.\n'));
  }

  // Helper to format file path relative to cwd
  relativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath);
  }
}

// Wrapper functions for file operations
export async function dryRunWriteFile(
  filePath: string,
  content: string,
  actualWriteFn: (path: string, content: string) => Promise<void>
): Promise<void> {
  const dryRun = DryRunManager.getInstance();

  if (dryRun.isEnabled()) {
    dryRun.addOperation({
      type: 'create',
      path: dryRun.relativePath(filePath),
      content,
      size: content.length,
    });
    return;
  }

  await actualWriteFn(filePath, content);
}

export async function dryRunModifyFile(
  filePath: string,
  actualModifyFn: (path: string) => Promise<void>
): Promise<void> {
  const dryRun = DryRunManager.getInstance();

  if (dryRun.isEnabled()) {
    dryRun.addOperation({
      type: 'modify',
      path: dryRun.relativePath(filePath),
    });
    return;
  }

  await actualModifyFn(filePath);
}

export async function dryRunDeleteFile(
  filePath: string,
  actualDeleteFn: (path: string) => Promise<void>
): Promise<void> {
  const dryRun = DryRunManager.getInstance();

  if (dryRun.isEnabled()) {
    dryRun.addOperation({
      type: 'delete',
      path: dryRun.relativePath(filePath),
    });
    return;
  }

  await actualDeleteFn(filePath);
}
