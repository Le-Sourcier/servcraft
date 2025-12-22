/* eslint-disable no-console */
import { Command } from 'commander';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import {
  toPascalCase,
  toCamelCase,
  toKebabCase,
  pluralize,
  writeFile,
  success,
  info,
  getModulesDir,
} from '../utils/helpers.js';
import { DryRunManager } from '../utils/dry-run.js';
import { parseFields } from '../utils/field-parser.js';
import { dynamicTypesTemplate } from '../templates/dynamic-types.js';
import { dynamicSchemasTemplate, type ValidatorType } from '../templates/dynamic-schemas.js';
import { dynamicPrismaTemplate } from '../templates/dynamic-prisma.js';
import { controllerTemplate } from '../templates/controller.js';
import { serviceTemplate } from '../templates/service.js';
import { repositoryTemplate } from '../templates/repository.js';
import { routesTemplate } from '../templates/routes.js';
import { moduleIndexTemplate } from '../templates/module-index.js';
import { controllerTestTemplate } from '../templates/controller-test.js';
import { serviceTestTemplate } from '../templates/service-test.js';
import { integrationTestTemplate } from '../templates/integration-test.js';
import { getTemplate } from '../utils/template-loader.js';

export const scaffoldCommand = new Command('scaffold')
  .description('Generate complete CRUD with Prisma model')
  .argument('<name>', 'Resource name (e.g., product, user)')
  .option(
    '--fields <fields>',
    'Field definitions: "name:string email:string? age:number category:relation"'
  )
  .option('--validator <type>', 'Validator type: zod, joi, yup', 'zod')
  .option('--dry-run', 'Preview changes without writing files')
  .action(
    async (
      name: string,
      options: { fields?: string; validator?: ValidatorType; dryRun?: boolean }
    ) => {
      const dryRun = DryRunManager.getInstance();
      if (options.dryRun) {
        dryRun.enable();
        console.log(chalk.yellow('\n⚠ DRY RUN MODE - No files will be written\n'));
      }

      if (!options.fields) {
        console.log(chalk.red('\n✗ Error: --fields option is required\n'));
        console.log(chalk.gray('Example:'));
        console.log(
          chalk.cyan(
            '  servcraft scaffold product --fields "name:string price:number category:relation"'
          )
        );
        process.exit(1);
      }

      const spinner = ora('Scaffolding resource...').start();

      try {
        // Parse fields
        const fields = parseFields(options.fields || '');

        if (!fields || fields.length === 0) {
          spinner.fail('No valid fields provided');
          console.log(chalk.gray(`\nReceived: ${options.fields}`));
          console.log(chalk.gray(`Parsed: ${JSON.stringify(fields)}`));
          process.exit(1);
        }

        // Generate names
        const kebabName = toKebabCase(name);
        const pascalName = toPascalCase(name);
        const camelName = toCamelCase(name);
        const pluralName = pluralize(camelName);
        const tableName = pluralize(kebabName);

        // Create module directory
        const modulesDir = getModulesDir();
        const moduleDir = path.join(modulesDir, kebabName);

        // Load templates (custom or built-in)
        const controllerTpl = await getTemplate('controller', controllerTemplate);
        const serviceTpl = await getTemplate('service', serviceTemplate);
        const repositoryTpl = await getTemplate('repository', repositoryTemplate);
        const routesTpl = await getTemplate('routes', routesTemplate);
        const moduleIndexTpl = await getTemplate('module-index', moduleIndexTemplate);

        // Generate all files
        const files = [
          {
            name: `${kebabName}.types.ts`,
            content: dynamicTypesTemplate(kebabName, pascalName, fields),
          },
          {
            name: `${kebabName}.schemas.ts`,
            content: dynamicSchemasTemplate(
              kebabName,
              pascalName,
              camelName,
              fields,
              options.validator || 'zod'
            ),
          },
          {
            name: `${kebabName}.service.ts`,
            content: serviceTpl(kebabName, pascalName, camelName),
          },
          {
            name: `${kebabName}.controller.ts`,
            content: controllerTpl(kebabName, pascalName, camelName),
          },
          {
            name: 'index.ts',
            content: moduleIndexTpl(kebabName, pascalName, camelName),
          },
          {
            name: `${kebabName}.repository.ts`,
            content: repositoryTpl(kebabName, pascalName, camelName, pluralName),
          },
          {
            name: `${kebabName}.routes.ts`,
            content: routesTpl(kebabName, pascalName, camelName, pluralName),
          },
        ];

        // Write all files
        for (const file of files) {
          await writeFile(path.join(moduleDir, file.name), file.content);
        }

        // Generate test files
        const testDir = path.join(moduleDir, '__tests__');

        // Load test templates (custom or built-in)
        const controllerTestTpl = await getTemplate('controller-test', controllerTestTemplate);
        const serviceTestTpl = await getTemplate('service-test', serviceTestTemplate);
        const integrationTestTpl = await getTemplate('integration-test', integrationTestTemplate);

        await writeFile(
          path.join(testDir, `${kebabName}.controller.test.ts`),
          controllerTestTpl(kebabName, pascalName, camelName)
        );

        await writeFile(
          path.join(testDir, `${kebabName}.service.test.ts`),
          serviceTestTpl(kebabName, pascalName, camelName)
        );

        await writeFile(
          path.join(testDir, `${kebabName}.integration.test.ts`),
          integrationTestTpl(kebabName, pascalName, camelName)
        );

        spinner.succeed(`Resource "${pascalName}" scaffolded successfully!`);

        // Show Prisma model
        console.log('\n' + '─'.repeat(70));
        info('📋 Prisma model to add to schema.prisma:');
        console.log(chalk.gray('\n// Copy this to your schema.prisma file:\n'));
        console.log(dynamicPrismaTemplate(pascalName, tableName, fields));
        console.log('─'.repeat(70));

        // Show fields summary
        console.log('\n📋 Fields scaffolded:');
        fields.forEach((f) => {
          const opts = [];
          if (f.isOptional) opts.push('optional');
          if (f.isArray) opts.push('array');
          if (f.isUnique) opts.push('unique');
          if (f.relation) opts.push(`relation: ${f.relation.model}`);
          const optsStr = opts.length > 0 ? ` (${opts.join(', ')})` : '';
          success(`  ${f.name}: ${f.type}${optsStr}`);
        });

        // Show files created
        console.log('\n📁 Files created:');
        files.forEach((f) => success(`  src/modules/${kebabName}/${f.name}`));
        success(`  src/modules/${kebabName}/__tests__/${kebabName}.controller.test.ts`);
        success(`  src/modules/${kebabName}/__tests__/${kebabName}.service.test.ts`);
        success(`  src/modules/${kebabName}/__tests__/${kebabName}.integration.test.ts`);

        // Show next steps
        console.log('\n📌 Next steps:');
        info('  1. Add the Prisma model to your schema.prisma file');
        info('  2. Run: npx prisma db push (or prisma migrate dev)');
        info('  3. Run: npx prisma generate');
        info('  4. Register the module routes in your app');
        info('  5. Update the test files with actual test data');

        console.log(
          chalk.gray('\n💡 Tip: Use --dry-run to preview changes before applying them\n')
        );

        if (options.dryRun) {
          dryRun.printSummary();
        }
      } catch (error) {
        spinner.fail('Failed to scaffold resource');
        if (error instanceof Error) {
          console.error(chalk.red(`\n✗ ${error.message}\n`));
          console.error(chalk.gray(error.stack));
        }
        process.exit(1);
      }
    }
  );
