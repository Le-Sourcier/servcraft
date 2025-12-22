import fs from 'fs/promises';
import path from 'path';
import { getProjectRoot } from './helpers.js';

/**
 * Template loader that checks for custom templates in priority order:
 * 1. Project templates (.servcraft/templates/)
 * 2. User templates (~/.servcraft/templates/)
 * 3. Built-in templates (fallback)
 */

export type TemplateType =
  | 'controller'
  | 'service'
  | 'repository'
  | 'types'
  | 'schemas'
  | 'routes'
  | 'module-index'
  | 'controller-test'
  | 'service-test'
  | 'integration-test';

interface TemplateFunction {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => string;
}

/**
 * Load a custom template if available, otherwise return null
 */
export async function loadCustomTemplate(
  templateType: TemplateType
): Promise<TemplateFunction | null> {
  const projectRoot = getProjectRoot();
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';

  const locations = [
    path.join(projectRoot, '.servcraft', 'templates', `${templateType}.ts`),
    path.join(homeDir, '.servcraft', 'templates', `${templateType}.ts`),
  ];

  for (const location of locations) {
    try {
      await fs.access(location);
      // Template file exists, dynamically import it
      const templateModule = (await import(`file://${location}`)) as TemplateFunction;

      // Look for the template function (e.g., controllerTemplate, serviceTemplate)
      const functionName = `${templateType.replace(/-/g, '')}Template`;

      if (templateModule[functionName]) {
        return templateModule;
      }
    } catch {
      // File doesn't exist or import failed, try next location
      continue;
    }
  }

  return null;
}

/**
 * Get template function with fallback to built-in
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTemplate<T extends (...args: any[]) => string>(
  templateType: TemplateType,
  builtInTemplate: T
): Promise<T> {
  const customTemplate = await loadCustomTemplate(templateType);

  if (customTemplate) {
    const functionName = `${templateType.replace(/-/g, '')}Template`;
    return customTemplate[functionName] as T;
  }

  return builtInTemplate;
}
