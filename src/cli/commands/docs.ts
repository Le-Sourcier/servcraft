import { Command } from 'commander';
import path from 'path';
import fs from 'fs/promises';
import ora from 'ora';
import chalk from 'chalk';
import { generateDocs } from '../utils/docs-generator.js';
import { success, error, info, warn, getProjectRoot } from '../utils/helpers.js';

export const docsCommand = new Command('docs').description('API documentation commands');

// Generate documentation
docsCommand
  .command('generate')
  .alias('gen')
  .description('Generate OpenAPI/Swagger documentation')
  .option('-o, --output <file>', 'Output file path', 'openapi.json')
  .option('-f, --format <format>', 'Output format: json, yaml', 'json')
  .action(async (options) => {
    try {
      const outputPath = await generateDocs(options.output, false);

      // Convert to YAML if requested
      if (options.format === 'yaml') {
        const jsonContent = await fs.readFile(outputPath, 'utf-8');
        const spec = JSON.parse(jsonContent);
        const yamlPath = outputPath.replace('.json', '.yaml');
        await fs.writeFile(yamlPath, jsonToYaml(spec));
        success(`YAML documentation generated: ${yamlPath}`);
      }

      console.log('\n📚 Documentation URLs:');
      info('  Swagger UI: http://localhost:3000/docs');
      info('  OpenAPI JSON: http://localhost:3000/docs/json');
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });

// Default action (backwards compatible)
docsCommand
  .option('-o, --output <path>', 'Output file path', 'openapi.json')
  .action(async (options) => {
    if (options.output) {
      try {
        const outputPath = await generateDocs(options.output);
        success(`Documentation written to ${outputPath}`);
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    }
  });

// Export to Postman/Insomnia
docsCommand
  .command('export')
  .description('Export documentation to Postman, Insomnia, or YAML')
  .option('-f, --format <format>', 'Export format: postman, insomnia, yaml', 'postman')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    const spinner = ora('Exporting documentation...').start();

    try {
      const projectRoot = getProjectRoot();
      const specPath = path.join(projectRoot, 'openapi.json');

      // Check if spec exists, generate if not
      try {
        await fs.access(specPath);
      } catch {
        spinner.text = 'Generating OpenAPI spec first...';
        await generateDocs('openapi.json', true);
      }

      const specContent = await fs.readFile(specPath, 'utf-8');
      const spec = JSON.parse(specContent);

      let output: string;
      let defaultName: string;

      switch (options.format) {
        case 'postman':
          output = JSON.stringify(convertToPostman(spec), null, 2);
          defaultName = 'postman_collection.json';
          break;
        case 'insomnia':
          output = JSON.stringify(convertToInsomnia(spec), null, 2);
          defaultName = 'insomnia_collection.json';
          break;
        case 'yaml':
          output = jsonToYaml(spec);
          defaultName = 'openapi.yaml';
          break;
        default:
          throw new Error(`Unknown format: ${options.format}`);
      }

      const outPath = path.join(projectRoot, options.output || defaultName);
      await fs.writeFile(outPath, output);

      spinner.succeed(`Exported to: ${options.output || defaultName}`);

      if (options.format === 'postman') {
        info('\n  Import in Postman: File > Import > Select file');
      }
    } catch (err) {
      spinner.fail('Export failed');
      error(err instanceof Error ? err.message : String(err));
    }
  });

// Show documentation status
docsCommand
  .command('status')
  .description('Show documentation status')
  .action(async () => {
    const projectRoot = getProjectRoot();

    console.log(chalk.bold('\n📊 Documentation Status\n'));

    // Check OpenAPI spec
    const specPath = path.join(projectRoot, 'openapi.json');
    try {
      const stat = await fs.stat(specPath);
      success(
        `openapi.json exists (${formatBytes(stat.size)}, modified ${formatDate(stat.mtime)})`
      );

      const content = await fs.readFile(specPath, 'utf-8');
      const spec = JSON.parse(content);
      const pathCount = Object.keys(spec.paths || {}).length;
      info(`  ${pathCount} endpoints documented`);
    } catch {
      warn('openapi.json not found - run "servcraft docs generate"');
    }

    console.log('\n📌 Commands:');
    info('  servcraft docs generate    Generate OpenAPI spec');
    info('  servcraft docs export      Export to Postman/Insomnia');
  });

// Helper functions
function jsonToYaml(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);

  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes(':') || obj.includes('#')) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj || '""';
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map((item) => `${spaces}- ${jsonToYaml(item, indent + 1).trimStart()}`).join('\n');
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';
    return entries
      .map(([key, value]) => {
        const valueStr = jsonToYaml(value, indent + 1);
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          Object.keys(value).length > 0
        ) {
          return `${spaces}${key}:\n${valueStr}`;
        }
        return `${spaces}${key}: ${valueStr}`;
      })
      .join('\n');
  }

  return String(obj);
}

interface OpenApiSpec {
  info: { title: string; description?: string; version: string };
  paths: Record<
    string,
    Record<string, { summary?: string; description?: string; requestBody?: unknown }>
  >;
  servers?: Array<{ url: string }>;
}

function convertToPostman(spec: OpenApiSpec): Record<string, unknown> {
  const baseUrl = spec.servers?.[0]?.url || 'http://localhost:3000';
  const items: Array<Record<string, unknown>> = [];

  for (const [pathUrl, methods] of Object.entries(spec.paths || {})) {
    for (const [method, details] of Object.entries(methods)) {
      items.push({
        name: details.summary || `${method.toUpperCase()} ${pathUrl}`,
        request: {
          method: method.toUpperCase(),
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Authorization', value: 'Bearer {{token}}' },
          ],
          url: {
            raw: `{{baseUrl}}${pathUrl}`,
            host: ['{{baseUrl}}'],
            path: pathUrl.split('/').filter(Boolean),
          },
          ...(details.requestBody ? { body: { mode: 'raw', raw: '{}' } } : {}),
        },
      });
    }
  }

  return {
    info: {
      name: spec.info.title,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
    variable: [
      { key: 'baseUrl', value: baseUrl },
      { key: 'token', value: '' },
    ],
  };
}

function convertToInsomnia(spec: OpenApiSpec): Record<string, unknown> {
  const baseUrl = spec.servers?.[0]?.url || 'http://localhost:3000';
  const resources: Array<Record<string, unknown>> = [
    { _type: 'environment', name: 'Base Environment', data: { baseUrl, token: '' } },
  ];

  for (const [pathUrl, methods] of Object.entries(spec.paths || {})) {
    for (const [method, details] of Object.entries(methods)) {
      resources.push({
        _type: 'request',
        name: details.summary || `${method.toUpperCase()} ${pathUrl}`,
        method: method.toUpperCase(),
        url: `{{ baseUrl }}${pathUrl}`,
        headers: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Authorization', value: 'Bearer {{ token }}' },
        ],
      });
    }
  }

  return { _type: 'export', __export_format: 4, resources };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
