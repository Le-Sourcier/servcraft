/* eslint-disable no-console */
import chalk from 'chalk';

export interface ErrorSuggestion {
  message: string;
  suggestions: string[];
  docsLink?: string;
}

export class ServCraftError extends Error {
  suggestions: string[];
  docsLink?: string;

  constructor(message: string, suggestions: string[] = [], docsLink?: string) {
    super(message);
    this.name = 'ServCraftError';
    this.suggestions = suggestions;
    this.docsLink = docsLink;
  }
}

// Common error types with suggestions
export const ErrorTypes = {
  MODULE_NOT_FOUND: (moduleName: string): ServCraftError =>
    new ServCraftError(
      `Module "${moduleName}" not found`,
      [
        `Run ${chalk.cyan('servcraft list')} to see available modules`,
        `Check the spelling of the module name`,
        `Visit ${chalk.blue('https://github.com/Le-Sourcier/servcraft#modules')} for module list`,
      ],
      'https://github.com/Le-Sourcier/servcraft#add-pre-built-modules'
    ),

  MODULE_ALREADY_EXISTS: (moduleName: string): ServCraftError =>
    new ServCraftError(`Module "${moduleName}" already exists`, [
      `Use ${chalk.cyan('servcraft add ' + moduleName + ' --force')} to overwrite`,
      `Use ${chalk.cyan('servcraft add ' + moduleName + ' --update')} to update`,
      `Use ${chalk.cyan('servcraft add ' + moduleName + ' --skip-existing')} to skip`,
    ]),

  NOT_IN_PROJECT: (): ServCraftError =>
    new ServCraftError(
      'Not in a ServCraft project directory',
      [
        `Run ${chalk.cyan('servcraft init')} to create a new project`,
        `Navigate to your ServCraft project directory`,
        `Check if ${chalk.yellow('package.json')} exists`,
      ],
      'https://github.com/Le-Sourcier/servcraft#initialize-project'
    ),

  FILE_ALREADY_EXISTS: (fileName: string): ServCraftError =>
    new ServCraftError(`File "${fileName}" already exists`, [
      `Use ${chalk.cyan('--force')} flag to overwrite`,
      `Choose a different name`,
      `Delete the existing file first`,
    ]),

  INVALID_DATABASE: (database: string): ServCraftError =>
    new ServCraftError(`Invalid database type: "${database}"`, [
      `Valid options: ${chalk.cyan('postgresql, mysql, sqlite, mongodb, none')}`,
      `Use ${chalk.cyan('servcraft init --db postgresql')} for PostgreSQL`,
    ]),

  INVALID_VALIDATOR: (validator: string): ServCraftError =>
    new ServCraftError(`Invalid validator type: "${validator}"`, [
      `Valid options: ${chalk.cyan('zod, joi, yup')}`,
      `Default is ${chalk.cyan('zod')}`,
    ]),

  MISSING_DEPENDENCY: (dependency: string, command: string): ServCraftError =>
    new ServCraftError(`Missing dependency: "${dependency}"`, [
      `Run ${chalk.cyan(command)} to install`,
      `Check your ${chalk.yellow('package.json')}`,
    ]),

  INVALID_FIELD_FORMAT: (field: string): ServCraftError =>
    new ServCraftError(`Invalid field format: "${field}"`, [
      `Expected format: ${chalk.cyan('name:type')}`,
      `Example: ${chalk.cyan('name:string age:number isActive:boolean')}`,
      `Supported types: string, number, boolean, date`,
    ]),

  GIT_NOT_INITIALIZED: (): ServCraftError =>
    new ServCraftError('Git repository not initialized', [
      `Run ${chalk.cyan('git init')} to initialize git`,
      `This is required for some ServCraft features`,
    ]),
};

// Display error with suggestions
export function displayError(error: Error | ServCraftError): void {
  console.error('\n' + chalk.red.bold('✗ Error: ') + chalk.red(error.message));

  if (error instanceof ServCraftError) {
    if (error.suggestions.length > 0) {
      console.log('\n' + chalk.yellow.bold('💡 Suggestions:'));
      error.suggestions.forEach((suggestion) => {
        console.log(chalk.yellow('  • ') + suggestion);
      });
    }

    if (error.docsLink) {
      console.log(
        '\n' + chalk.blue.bold('📚 Documentation: ') + chalk.blue.underline(error.docsLink)
      );
    }
  }

  console.log(); // Empty line for spacing
}

// Handle common Node.js errors
export function handleSystemError(err: NodeJS.ErrnoException): ServCraftError {
  switch (err.code) {
    case 'ENOENT':
      return new ServCraftError(`File or directory not found: ${err.path}`, [
        `Check if the path exists`,
        `Create the directory first`,
      ]);

    case 'EACCES':
    case 'EPERM':
      return new ServCraftError(`Permission denied: ${err.path}`, [
        `Check file permissions`,
        `Try running with elevated privileges (not recommended)`,
        `Change ownership of the directory`,
      ]);

    case 'EEXIST':
      return new ServCraftError(`File or directory already exists: ${err.path}`, [
        `Use a different name`,
        `Remove the existing file first`,
        `Use ${chalk.cyan('--force')} to overwrite`,
      ]);

    case 'ENOTDIR':
      return new ServCraftError(`Not a directory: ${err.path}`, [
        `Check the path`,
        `A file exists where a directory is expected`,
      ]);

    case 'EISDIR':
      return new ServCraftError(`Is a directory: ${err.path}`, [
        `Cannot perform this operation on a directory`,
        `Did you mean to target a file?`,
      ]);

    default:
      return new ServCraftError(err.message, [
        `Check system error code: ${err.code}`,
        `Review the error details above`,
      ]);
  }
}

// Validate project structure
export function validateProject(): ServCraftError | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');

    if (!fs.existsSync('package.json')) {
      return ErrorTypes.NOT_IN_PROJECT();
    }

    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

    if (!packageJson.dependencies?.fastify) {
      return new ServCraftError('This does not appear to be a ServCraft project', [
        `ServCraft projects require Fastify`,
        `Run ${chalk.cyan('servcraft init')} to create a new project`,
      ]);
    }

    return null;
  } catch {
    return new ServCraftError('Failed to validate project', [
      `Ensure you are in the project root directory`,
      `Check if ${chalk.yellow('package.json')} is valid`,
    ]);
  }
}
