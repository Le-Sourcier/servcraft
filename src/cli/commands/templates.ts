/* eslint-disable no-console */
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { getProjectRoot } from '../utils/helpers.js';
import { validateProject, displayError } from '../utils/error-handler.js';

// Template types available for customization
const TEMPLATE_TYPES = [
  'controller',
  'service',
  'repository',
  'types',
  'schemas',
  'routes',
  'module-index',
  'controller-test',
  'service-test',
  'integration-test',
];

async function initTemplates(): Promise<void> {
  const projectError = validateProject();
  if (projectError) {
    displayError(projectError);
    return;
  }

  const projectRoot = getProjectRoot();
  const templatesDir = path.join(projectRoot, '.servcraft', 'templates');

  try {
    // Create .servcraft/templates directory
    await fs.mkdir(templatesDir, { recursive: true });

    console.log(chalk.cyan('\n📁 Creating custom template directory...\n'));

    // Create example template files
    const exampleController = `// Custom controller template
// Available variables: name, pascalName, camelName, pluralName
export function controllerTemplate(name: string, pascalName: string, camelName: string): string {
  return \`import type { FastifyRequest, FastifyReply } from 'fastify';
import type { \${pascalName}Service } from './\${name}.service.js';

export class \${pascalName}Controller {
  constructor(private \${camelName}Service: \${pascalName}Service) {}

  // Add your custom controller methods here
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.\${camelName}Service.getAll();
    return reply.send({ data });
  }
}
\`;
}
`;

    await fs.writeFile(
      path.join(templatesDir, 'controller.example.ts'),
      exampleController,
      'utf-8'
    );

    console.log(chalk.green('✔ Created template directory: .servcraft/templates/'));
    console.log(chalk.green('✔ Created example template: controller.example.ts\n'));

    console.log(chalk.bold('📋 Available template types:\n'));
    TEMPLATE_TYPES.forEach((type) => {
      console.log(chalk.gray(`  • ${type}.ts`));
    });

    console.log(chalk.yellow('\n💡 To customize a template:'));
    console.log(chalk.gray('  1. Copy the example template'));
    console.log(chalk.gray('  2. Rename it (remove .example)'));
    console.log(chalk.gray('  3. Modify the template code'));
    console.log(chalk.gray('  4. Use --template flag when generating\n'));
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`\n✗ Failed to initialize templates: ${error.message}\n`));
    }
  }
}

async function listTemplates(): Promise<void> {
  const projectError = validateProject();
  if (projectError) {
    displayError(projectError);
    return;
  }

  const projectRoot = getProjectRoot();
  const projectTemplatesDir = path.join(projectRoot, '.servcraft', 'templates');
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const userTemplatesDir = path.join(homeDir, '.servcraft', 'templates');

  console.log(chalk.bold.cyan('\n📋 Available Templates\n'));

  // Check project templates
  console.log(chalk.bold('Project templates (.servcraft/templates/):'));
  try {
    const files = await fs.readdir(projectTemplatesDir);
    const templates = files.filter((f) => f.endsWith('.ts') && !f.endsWith('.example.ts'));

    if (templates.length > 0) {
      templates.forEach((t) => {
        console.log(chalk.green(`  ✓ ${t}`));
      });
    } else {
      console.log(chalk.gray('  (none)'));
    }
  } catch {
    console.log(chalk.gray('  (directory not found)'));
  }

  // Check user templates
  console.log(chalk.bold('\nUser templates (~/.servcraft/templates/):'));
  try {
    const files = await fs.readdir(userTemplatesDir);
    const templates = files.filter((f) => f.endsWith('.ts') && !f.endsWith('.example.ts'));

    if (templates.length > 0) {
      templates.forEach((t) => {
        console.log(chalk.green(`  ✓ ${t}`));
      });
    } else {
      console.log(chalk.gray('  (none)'));
    }
  } catch {
    console.log(chalk.gray('  (directory not found)'));
  }

  // Show built-in templates
  console.log(chalk.bold('\nBuilt-in templates:'));
  TEMPLATE_TYPES.forEach((t) => {
    console.log(chalk.cyan(`  • ${t}.ts`));
  });

  console.log(chalk.gray('\n💡 Run "servcraft templates init" to create custom templates\n'));
}

export const templatesCommand = new Command('templates')
  .description('Manage code generation templates')
  .addCommand(
    new Command('init').description('Initialize custom templates directory').action(initTemplates)
  )
  .addCommand(new Command('list').description('List available templates').action(listTemplates));
