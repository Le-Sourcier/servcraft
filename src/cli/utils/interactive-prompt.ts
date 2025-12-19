import inquirer from 'inquirer';
import chalk from 'chalk';

export interface MergeChoice {
  action: 'skip' | 'update' | 'overwrite' | 'diff' | 'backup-overwrite';
}

export interface FileChoice {
  action: 'merge' | 'keep' | 'overwrite' | 'diff' | 'skip';
}

/**
 * Interactive prompt utilities
 */
export class InteractivePrompt {
  /**
   * Ask what to do when module already exists
   */
  static async askModuleExists(
    moduleName: string,
    hasModifications: boolean
  ): Promise<MergeChoice> {
    console.log(chalk.yellow(`\n⚠️  Module "${moduleName}" already exists`));

    if (hasModifications) {
      console.log(chalk.yellow('   Some files have been modified by you.\n'));
    }

    const { action } = await inquirer.prompt<{ action: MergeChoice['action'] }>([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          {
            name: '✓ Skip (keep existing files, recommended if you made custom changes)',
            value: 'skip',
          },
          {
            name: '↻ Update (merge new features, preserve your customizations)',
            value: 'update',
          },
          {
            name: '⚠  Overwrite (replace all files, will lose your changes)',
            value: 'overwrite',
          },
          {
            name: '📋 Show diff (see what changed)',
            value: 'diff',
          },
          {
            name: '💾 Backup & overwrite (save backup then replace)',
            value: 'backup-overwrite',
          },
        ],
        default: 'skip',
      },
    ]);

    return { action };
  }

  /**
   * Ask what to do with a specific file
   */
  static async askFileAction(
    fileName: string,
    isModified: boolean,
    yourLines: number,
    newLines: number
  ): Promise<FileChoice> {
    console.log(chalk.cyan(`\n📁 ${fileName}`));
    console.log(
      chalk.gray(`   Your version: ${yourLines} lines${isModified ? ' (modified)' : ''}`)
    );
    console.log(chalk.gray(`   New version: ${newLines} lines\n`));

    const { action } = await inquirer.prompt<{ action: FileChoice['action'] }>([
      {
        type: 'list',
        name: 'action',
        message: 'Action for this file:',
        choices: [
          {
            name: '[M]erge - Smart merge, preserve your changes',
            value: 'merge',
          },
          {
            name: '[K]eep - Keep your version (skip update)',
            value: 'keep',
          },
          {
            name: '[O]verwrite - Use new version',
            value: 'overwrite',
          },
          {
            name: '[D]iff - Show differences',
            value: 'diff',
          },
          {
            name: '[S]kip - Skip this file',
            value: 'skip',
          },
        ],
        default: isModified ? 'merge' : 'overwrite',
      },
    ]);

    return { action };
  }

  /**
   * Confirm action
   */
  static async confirm(message: string, defaultValue = false): Promise<boolean> {
    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: defaultValue,
      },
    ]);

    return confirmed;
  }

  /**
   * Display diff and ask to continue
   */
  static async showDiffAndAsk(diff: string): Promise<boolean> {
    console.log(chalk.cyan('\n📊 Differences:\n'));
    console.log(diff);

    return await this.confirm('\nDo you want to proceed with this change?', true);
  }

  /**
   * Display merge conflicts
   */
  static displayConflicts(conflicts: string[]): void {
    console.log(chalk.red('\n⚠️  Merge Conflicts Detected:\n'));
    conflicts.forEach((conflict, i) => {
      console.log(chalk.yellow(`   ${i + 1}. ${conflict}`));
    });
    console.log(chalk.gray('\n   Conflict markers have been added to the file:'));
    console.log(chalk.gray('   <<<<<<< YOUR VERSION'));
    console.log(chalk.gray('   ... your code ...'));
    console.log(chalk.gray('   ======='));
    console.log(chalk.gray('   ... new code ...'));
    console.log(chalk.gray('   >>>>>>> NEW VERSION\n'));
  }

  /**
   * Show backup location
   */
  static showBackupCreated(backupPath: string): void {
    console.log(chalk.green(`\n✓ Backup created: ${chalk.cyan(backupPath)}`));
  }

  /**
   * Show merge summary
   */
  static showMergeSummary(stats: {
    merged: number;
    kept: number;
    overwritten: number;
    conflicts: number;
  }): void {
    console.log(chalk.bold('\n📊 Merge Summary:\n'));
    if (stats.merged > 0) {
      console.log(chalk.green(`   ✓ Merged: ${stats.merged} file(s)`));
    }
    if (stats.kept > 0) {
      console.log(chalk.blue(`   → Kept: ${stats.kept} file(s)`));
    }
    if (stats.overwritten > 0) {
      console.log(chalk.yellow(`   ⚠ Overwritten: ${stats.overwritten} file(s)`));
    }
    if (stats.conflicts > 0) {
      console.log(chalk.red(`   ⚠ Conflicts: ${stats.conflicts} file(s)`));
      console.log(chalk.gray('\n   Please resolve conflicts manually before committing.\n'));
    }
  }

  /**
   * Ask for batch action on all files
   */
  static async askBatchAction(): Promise<
    'individual' | 'merge-all' | 'keep-all' | 'overwrite-all'
  > {
    const { action } = await inquirer.prompt<{
      action: 'individual' | 'merge-all' | 'keep-all' | 'overwrite-all';
    }>([
      {
        type: 'list',
        name: 'action',
        message: 'Multiple files found. Choose action:',
        choices: [
          {
            name: 'Ask for each file individually (recommended)',
            value: 'individual',
          },
          {
            name: 'Merge all files automatically',
            value: 'merge-all',
          },
          {
            name: 'Keep all existing files (skip update)',
            value: 'keep-all',
          },
          {
            name: 'Overwrite all files with new versions',
            value: 'overwrite-all',
          },
        ],
        default: 'individual',
      },
    ]);

    return action;
  }
}
