import { Command } from 'commander';
import path from 'path';
import ora from 'ora';
import inquirer from 'inquirer';
import {
  toPascalCase,
  toCamelCase,
  toKebabCase,
  pluralize,
  fileExists,
  writeFile,
  success,
  error,
  info,
  getModulesDir,
} from '../utils/helpers.js';
import { DryRunManager } from '../utils/dry-run.js';
import chalk from 'chalk';
import { parseFields, type FieldDefinition } from '../utils/field-parser.js';
import { ErrorTypes, displayError } from '../utils/error-handler.js';

// Helper to enable dry-run mode
function enableDryRunIfNeeded(options: { dryRun?: boolean }): void {
  const dryRun = DryRunManager.getInstance();
  if (options.dryRun) {
    dryRun.enable();
    console.log(chalk.yellow('\n⚠ DRY RUN MODE - No files will be written\n'));
  }
}

// Helper to show dry-run summary
function showDryRunSummary(options: { dryRun?: boolean }): void {
  if (options.dryRun) {
    DryRunManager.getInstance().printSummary();
  }
}
import { controllerTemplate } from '../templates/controller.js';
import { serviceTemplate } from '../templates/service.js';
import { repositoryTemplate } from '../templates/repository.js';
import { typesTemplate } from '../templates/types.js';
import { schemasTemplate } from '../templates/schemas.js';
import { routesTemplate } from '../templates/routes.js';
import { moduleIndexTemplate } from '../templates/module-index.js';
import { prismaModelTemplate } from '../templates/prisma-model.js';
import { dynamicTypesTemplate } from '../templates/dynamic-types.js';
import { dynamicSchemasTemplate, type ValidatorType } from '../templates/dynamic-schemas.js';
import { dynamicPrismaTemplate } from '../templates/dynamic-prisma.js';

export const generateCommand = new Command('generate')
  .alias('g')
  .description('Generate resources (module, controller, service, etc.)');

// Generate full module
generateCommand
  .command('module <name> [fields...]')
  .alias('m')
  .description(
    'Generate a complete module with controller, service, repository, types, schemas, and routes'
  )
  .option('--no-routes', 'Skip routes generation')
  .option('--no-repository', 'Skip repository generation')
  .option('--prisma', 'Generate Prisma model suggestion')
  .option('--validator <type>', 'Validator type: zod, joi, yup', 'zod')
  .option('-i, --interactive', 'Interactive mode to define fields')
  .option('--dry-run', 'Preview changes without writing files')
  .action(async (name: string, fieldsArgs: string[], options) => {
    enableDryRunIfNeeded(options);
    let fields: FieldDefinition[] = [];

    // Parse fields from command line or interactive mode
    if (options.interactive) {
      fields = await promptForFields();
    } else if (fieldsArgs.length > 0) {
      fields = parseFields(fieldsArgs.join(' '));
    }

    const spinner = ora('Generating module...').start();

    try {
      const kebabName = toKebabCase(name);
      const pascalName = toPascalCase(name);
      const camelName = toCamelCase(name);
      const pluralName = pluralize(kebabName);
      const tableName = pluralize(kebabName.replace(/-/g, '_'));
      const validatorType = (options.validator || 'zod') as ValidatorType;

      const moduleDir = path.join(getModulesDir(), kebabName);

      // Check if module already exists
      if (await fileExists(moduleDir)) {
        spinner.stop();
        error(`Module "${kebabName}" already exists`);
        return;
      }

      // Use dynamic templates if fields are provided
      const hasFields = fields.length > 0;

      const files = [
        {
          name: `${kebabName}.types.ts`,
          content: hasFields
            ? dynamicTypesTemplate(kebabName, pascalName, fields)
            : typesTemplate(kebabName, pascalName),
        },
        {
          name: `${kebabName}.schemas.ts`,
          content: hasFields
            ? dynamicSchemasTemplate(kebabName, pascalName, camelName, fields, validatorType)
            : schemasTemplate(kebabName, pascalName, camelName),
        },
        {
          name: `${kebabName}.service.ts`,
          content: serviceTemplate(kebabName, pascalName, camelName),
        },
        {
          name: `${kebabName}.controller.ts`,
          content: controllerTemplate(kebabName, pascalName, camelName),
        },
        { name: 'index.ts', content: moduleIndexTemplate(kebabName, pascalName, camelName) },
      ];

      if (options.repository !== false) {
        files.push({
          name: `${kebabName}.repository.ts`,
          content: repositoryTemplate(kebabName, pascalName, camelName, pluralName),
        });
      }

      if (options.routes !== false) {
        files.push({
          name: `${kebabName}.routes.ts`,
          content: routesTemplate(kebabName, pascalName, camelName, pluralName),
        });
      }

      // Write all files
      for (const file of files) {
        await writeFile(path.join(moduleDir, file.name), file.content);
      }

      spinner.succeed(`Module "${pascalName}" generated successfully!`);

      // Show Prisma model if requested or fields provided
      if (options.prisma || hasFields) {
        console.log('\n' + '─'.repeat(50));
        info('Prisma model suggestion:');
        if (hasFields) {
          console.log(dynamicPrismaTemplate(pascalName, tableName, fields));
        } else {
          console.log(prismaModelTemplate(kebabName, pascalName, tableName));
        }
      }

      // Show fields summary if provided
      if (hasFields) {
        console.log('\n📋 Fields defined:');
        fields.forEach((f) => {
          const opts = [];
          if (f.isOptional) opts.push('optional');
          if (f.isArray) opts.push('array');
          if (f.isUnique) opts.push('unique');
          const optsStr = opts.length > 0 ? ` (${opts.join(', ')})` : '';
          success(`  ${f.name}: ${f.type}${optsStr}`);
        });
      }

      // Show next steps
      console.log('\n📁 Files created:');
      files.forEach((f) => success(`  src/modules/${kebabName}/${f.name}`));

      console.log('\n📌 Next steps:');
      if (!hasFields) {
        info('  1. Update the types in ' + `${kebabName}.types.ts`);
        info('  2. Update the schemas in ' + `${kebabName}.schemas.ts`);
        info('  3. Register the module in your app');
      } else {
        info('  1. Review generated types and schemas');
        info('  2. Register the module in your app');
      }
      if (options.prisma || hasFields) {
        info(`  ${hasFields ? '3' : '4'}. Add the Prisma model to schema.prisma`);
        info(`  ${hasFields ? '4' : '5'}. Run: npm run db:migrate`);
      }

      // Show dry-run summary if enabled
      showDryRunSummary(options);
    } catch (err) {
      spinner.fail('Failed to generate module');
      error(err instanceof Error ? err.message : String(err));
    }
  });

// Generate controller only
generateCommand
  .command('controller <name>')
  .alias('c')
  .description('Generate a controller')
  .option('-m, --module <module>', 'Target module name')
  .option('--dry-run', 'Preview changes without writing files')
  .action(async (name: string, options) => {
    enableDryRunIfNeeded(options);
    const spinner = ora('Generating controller...').start();

    try {
      const kebabName = toKebabCase(name);
      const pascalName = toPascalCase(name);
      const camelName = toCamelCase(name);

      const moduleName = options.module ? toKebabCase(options.module) : kebabName;
      const moduleDir = path.join(getModulesDir(), moduleName);
      const filePath = path.join(moduleDir, `${kebabName}.controller.ts`);

      if (await fileExists(filePath)) {
        spinner.stop();
        displayError(ErrorTypes.FILE_ALREADY_EXISTS(`${kebabName}.controller.ts`));
        return;
      }

      await writeFile(filePath, controllerTemplate(kebabName, pascalName, camelName));

      spinner.succeed(`Controller "${pascalName}Controller" generated!`);
      success(`  src/modules/${moduleName}/${kebabName}.controller.ts`);
      showDryRunSummary(options);
    } catch (err) {
      spinner.fail('Failed to generate controller');
      error(err instanceof Error ? err.message : String(err));
    }
  });

// Generate service only
generateCommand
  .command('service <name>')
  .alias('s')
  .description('Generate a service')
  .option('-m, --module <module>', 'Target module name')
  .option('--dry-run', 'Preview changes without writing files')
  .action(async (name: string, options) => {
    enableDryRunIfNeeded(options);
    const spinner = ora('Generating service...').start();

    try {
      const kebabName = toKebabCase(name);
      const pascalName = toPascalCase(name);
      const camelName = toCamelCase(name);

      const moduleName = options.module ? toKebabCase(options.module) : kebabName;
      const moduleDir = path.join(getModulesDir(), moduleName);
      const filePath = path.join(moduleDir, `${kebabName}.service.ts`);

      if (await fileExists(filePath)) {
        spinner.stop();
        error(`Service "${kebabName}" already exists`);
        return;
      }

      await writeFile(filePath, serviceTemplate(kebabName, pascalName, camelName));

      spinner.succeed(`Service "${pascalName}Service" generated!`);
      success(`  src/modules/${moduleName}/${kebabName}.service.ts`);
      showDryRunSummary(options);
    } catch (err) {
      spinner.fail('Failed to generate service');
      error(err instanceof Error ? err.message : String(err));
    }
  });

// Generate repository only
generateCommand
  .command('repository <name>')
  .alias('r')
  .description('Generate a repository')
  .option('-m, --module <module>', 'Target module name')
  .option('--dry-run', 'Preview changes without writing files')
  .action(async (name: string, options) => {
    enableDryRunIfNeeded(options);
    const spinner = ora('Generating repository...').start();

    try {
      const kebabName = toKebabCase(name);
      const pascalName = toPascalCase(name);
      const camelName = toCamelCase(name);
      const pluralName = pluralize(kebabName);

      const moduleName = options.module ? toKebabCase(options.module) : kebabName;
      const moduleDir = path.join(getModulesDir(), moduleName);
      const filePath = path.join(moduleDir, `${kebabName}.repository.ts`);

      if (await fileExists(filePath)) {
        spinner.stop();
        error(`Repository "${kebabName}" already exists`);
        return;
      }

      await writeFile(filePath, repositoryTemplate(kebabName, pascalName, camelName, pluralName));

      spinner.succeed(`Repository "${pascalName}Repository" generated!`);
      success(`  src/modules/${moduleName}/${kebabName}.repository.ts`);
      showDryRunSummary(options);
    } catch (err) {
      spinner.fail('Failed to generate repository');
      error(err instanceof Error ? err.message : String(err));
    }
  });

// Generate types only
generateCommand
  .command('types <name>')
  .alias('t')
  .description('Generate types/interfaces')
  .option('-m, --module <module>', 'Target module name')
  .option('--dry-run', 'Preview changes without writing files')
  .action(async (name: string, options) => {
    enableDryRunIfNeeded(options);
    const spinner = ora('Generating types...').start();

    try {
      const kebabName = toKebabCase(name);
      const pascalName = toPascalCase(name);

      const moduleName = options.module ? toKebabCase(options.module) : kebabName;
      const moduleDir = path.join(getModulesDir(), moduleName);
      const filePath = path.join(moduleDir, `${kebabName}.types.ts`);

      if (await fileExists(filePath)) {
        spinner.stop();
        error(`Types file "${kebabName}.types.ts" already exists`);
        return;
      }

      await writeFile(filePath, typesTemplate(kebabName, pascalName));

      spinner.succeed(`Types for "${pascalName}" generated!`);
      success(`  src/modules/${moduleName}/${kebabName}.types.ts`);
      showDryRunSummary(options);
    } catch (err) {
      spinner.fail('Failed to generate types');
      error(err instanceof Error ? err.message : String(err));
    }
  });

// Generate schemas/validators only
generateCommand
  .command('schema <name>')
  .alias('v')
  .description('Generate validation schemas')
  .option('-m, --module <module>', 'Target module name')
  .option('--dry-run', 'Preview changes without writing files')
  .action(async (name: string, options) => {
    enableDryRunIfNeeded(options);
    const spinner = ora('Generating schemas...').start();

    try {
      const kebabName = toKebabCase(name);
      const pascalName = toPascalCase(name);
      const camelName = toCamelCase(name);

      const moduleName = options.module ? toKebabCase(options.module) : kebabName;
      const moduleDir = path.join(getModulesDir(), moduleName);
      const filePath = path.join(moduleDir, `${kebabName}.schemas.ts`);

      if (await fileExists(filePath)) {
        spinner.stop();
        error(`Schemas file "${kebabName}.schemas.ts" already exists`);
        return;
      }

      await writeFile(filePath, schemasTemplate(kebabName, pascalName, camelName));

      spinner.succeed(`Schemas for "${pascalName}" generated!`);
      success(`  src/modules/${moduleName}/${kebabName}.schemas.ts`);
      showDryRunSummary(options);
    } catch (err) {
      spinner.fail('Failed to generate schemas');
      error(err instanceof Error ? err.message : String(err));
    }
  });

// Generate routes only
generateCommand
  .command('routes <name>')
  .description('Generate routes')
  .option('-m, --module <module>', 'Target module name')
  .option('--dry-run', 'Preview changes without writing files')
  .action(async (name: string, options) => {
    enableDryRunIfNeeded(options);
    const spinner = ora('Generating routes...').start();

    try {
      const kebabName = toKebabCase(name);
      const pascalName = toPascalCase(name);
      const camelName = toCamelCase(name);
      const pluralName = pluralize(kebabName);

      const moduleName = options.module ? toKebabCase(options.module) : kebabName;
      const moduleDir = path.join(getModulesDir(), moduleName);
      const filePath = path.join(moduleDir, `${kebabName}.routes.ts`);

      if (await fileExists(filePath)) {
        spinner.stop();
        error(`Routes file "${kebabName}.routes.ts" already exists`);
        return;
      }

      await writeFile(filePath, routesTemplate(kebabName, pascalName, camelName, pluralName));

      spinner.succeed(`Routes for "${pascalName}" generated!`);
      success(`  src/modules/${moduleName}/${kebabName}.routes.ts`);
      showDryRunSummary(options);
    } catch (err) {
      spinner.fail('Failed to generate routes');
      error(err instanceof Error ? err.message : String(err));
    }
  });

// Interactive field prompt helper
async function promptForFields(): Promise<FieldDefinition[]> {
  const fields: FieldDefinition[] = [];

  console.log('\n📝 Define your model fields (press Enter with empty name to finish)\n');

  const fieldTypes = [
    'string',
    'number',
    'boolean',
    'date',
    'datetime',
    'text',
    'email',
    'url',
    'uuid',
    'int',
    'float',
    'decimal',
    'json',
  ];

  let addMore = true;

  while (addMore) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Field name (empty to finish):',
      },
    ]);

    if (!answers.name) {
      addMore = false;
      continue;
    }

    const fieldDetails = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: `Type for "${answers.name}":`,
        choices: fieldTypes,
        default: 'string',
      },
      {
        type: 'confirm',
        name: 'isOptional',
        message: 'Is optional?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'isUnique',
        message: 'Is unique?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'isArray',
        message: 'Is array?',
        default: false,
      },
    ]);

    fields.push({
      name: answers.name,
      type: fieldDetails.type,
      isOptional: fieldDetails.isOptional,
      isUnique: fieldDetails.isUnique,
      isArray: fieldDetails.isArray,
    });

    console.log(`  ✓ Added: ${answers.name}: ${fieldDetails.type}\n`);
  }

  return fields;
}
