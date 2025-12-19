import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { existsSync } from 'fs';

export interface Template {
  /** Template name */
  name: string;
  /** Template content */
  content: string;
  /** Template hash for change detection */
  hash: string;
  /** Template version */
  version: string;
}

export interface ModuleManifest {
  /** Module name */
  name: string;
  /** Module version */
  version: string;
  /** Files in this module */
  files: Record<string, { hash: string; path: string }>;
  /** Install date */
  installedAt: Date;
  /** Last update */
  updatedAt: Date;
}

/**
 * Template Manager
 * Manages module templates and tracks installed versions
 */
export class TemplateManager {
  private templatesDir: string;
  private manifestsDir: string;

  constructor(projectRoot: string) {
    this.templatesDir = path.join(projectRoot, '.servcraft', 'templates');
    this.manifestsDir = path.join(projectRoot, '.servcraft', 'manifests');
  }

  /**
   * Initialize template system
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.templatesDir, { recursive: true });
    await fs.mkdir(this.manifestsDir, { recursive: true });
  }

  /**
   * Save module template
   */
  async saveTemplate(moduleName: string, files: Record<string, string>): Promise<void> {
    await this.initialize();

    const moduleTemplateDir = path.join(this.templatesDir, moduleName);
    await fs.mkdir(moduleTemplateDir, { recursive: true });

    // Save each file
    for (const [fileName, content] of Object.entries(files)) {
      const filePath = path.join(moduleTemplateDir, fileName);
      await fs.writeFile(filePath, content, 'utf-8');
    }
  }

  /**
   * Get template content
   */
  async getTemplate(moduleName: string, fileName: string): Promise<string | null> {
    try {
      const filePath = path.join(this.templatesDir, moduleName, fileName);
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Save module manifest
   */
  async saveManifest(moduleName: string, files: Record<string, string>): Promise<void> {
    await this.initialize();

    const fileHashes: Record<string, { hash: string; path: string }> = {};

    for (const [fileName, content] of Object.entries(files)) {
      fileHashes[fileName] = {
        hash: this.hashContent(content),
        path: `src/modules/${moduleName}/${fileName}`,
      };
    }

    const manifest: ModuleManifest = {
      name: moduleName,
      version: '1.0.0',
      files: fileHashes,
      installedAt: new Date(),
      updatedAt: new Date(),
    };

    const manifestPath = path.join(this.manifestsDir, `${moduleName}.json`);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  /**
   * Get module manifest
   */
  async getManifest(moduleName: string): Promise<ModuleManifest | null> {
    try {
      const manifestPath = path.join(this.manifestsDir, `${moduleName}.json`);
      const content = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(content) as ModuleManifest;
    } catch {
      return null;
    }
  }

  /**
   * Check if file has been modified by user
   */
  async isFileModified(
    moduleName: string,
    fileName: string,
    currentContent: string
  ): Promise<boolean> {
    const manifest = await this.getManifest(moduleName);

    if (!manifest || !manifest.files[fileName]) {
      return false;
    }

    const originalHash = manifest.files[fileName].hash;
    const currentHash = this.hashContent(currentContent);

    return originalHash !== currentHash;
  }

  /**
   * Get all modified files in a module
   */
  async getModifiedFiles(
    moduleName: string,
    moduleDir: string
  ): Promise<
    Array<{ fileName: string; isModified: boolean; originalHash: string; currentHash: string }>
  > {
    const manifest = await this.getManifest(moduleName);

    if (!manifest) {
      return [];
    }

    const results = [];

    for (const [fileName, fileInfo] of Object.entries(manifest.files)) {
      const filePath = path.join(moduleDir, fileName);

      if (!existsSync(filePath)) {
        results.push({
          fileName,
          isModified: true,
          originalHash: fileInfo.hash,
          currentHash: '',
        });
        continue;
      }

      const currentContent = await fs.readFile(filePath, 'utf-8');
      const currentHash = this.hashContent(currentContent);

      results.push({
        fileName,
        isModified: fileInfo.hash !== currentHash,
        originalHash: fileInfo.hash,
        currentHash,
      });
    }

    return results;
  }

  /**
   * Create backup of module
   */
  async createBackup(moduleName: string, moduleDir: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const backupDir = path.join(path.dirname(moduleDir), `${moduleName}.backup-${timestamp}`);

    await this.copyDirectory(moduleDir, backupDir);

    return backupDir;
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });

    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Perform 3-way merge
   */
  async mergeFiles(
    original: string,
    modified: string,
    incoming: string
  ): Promise<{ merged: string; hasConflicts: boolean; conflicts: string[] }> {
    const conflicts: string[] = [];
    let hasConflicts = false;

    // Simple line-based merge
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    const incomingLines = incoming.split('\n');

    const merged: string[] = [];

    // This is a simplified merge - in production, use a proper diff3 algorithm
    // For now, we'll use a basic strategy:
    // 1. If modified === original, use incoming (user hasn't changed it)
    // 2. If modified !== original, keep modified (user changed it)
    // 3. If both changed, mark as conflict

    const maxLength = Math.max(originalLines.length, modifiedLines.length, incomingLines.length);

    for (let i = 0; i < maxLength; i++) {
      const origLine = originalLines[i] || '';
      const modLine = modifiedLines[i] || '';
      const incLine = incomingLines[i] || '';

      if (modLine === origLine) {
        // User hasn't modified, use incoming
        merged.push(incLine);
      } else if (incLine === origLine) {
        // Template hasn't changed, keep user's modification
        merged.push(modLine);
      } else if (modLine === incLine) {
        // Both have same change, no conflict
        merged.push(modLine);
      } else {
        // Conflict: both modified differently
        hasConflicts = true;
        conflicts.push(`Line ${i + 1}: User and template both modified`);
        merged.push(`<<<<<<< YOUR VERSION`);
        merged.push(modLine);
        merged.push(`=======`);
        merged.push(incLine);
        merged.push(`>>>>>>> NEW VERSION`);
      }
    }

    return {
      merged: merged.join('\n'),
      hasConflicts,
      conflicts,
    };
  }

  /**
   * Generate diff between two files
   */
  generateDiff(original: string, modified: string): string {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');

    const diff: string[] = [];
    diff.push('--- Original');
    diff.push('+++ Modified');
    diff.push('');

    const maxLength = Math.max(originalLines.length, modifiedLines.length);

    for (let i = 0; i < maxLength; i++) {
      const origLine = originalLines[i];
      const modLine = modifiedLines[i];

      if (origLine !== modLine) {
        if (origLine !== undefined) {
          diff.push(`- ${origLine}`);
        }
        if (modLine !== undefined) {
          diff.push(`+ ${modLine}`);
        }
      }
    }

    return diff.join('\n');
  }

  /**
   * Hash content for change detection
   */
  private hashContent(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }

  /**
   * Check if module is installed
   */
  async isModuleInstalled(moduleName: string): Promise<boolean> {
    const manifest = await this.getManifest(moduleName);
    return manifest !== null;
  }

  /**
   * Update manifest after merge
   */
  async updateManifest(moduleName: string, files: Record<string, string>): Promise<void> {
    const manifest = await this.getManifest(moduleName);

    if (!manifest) {
      await this.saveManifest(moduleName, files);
      return;
    }

    const fileHashes: Record<string, { hash: string; path: string }> = {};

    for (const [fileName, content] of Object.entries(files)) {
      fileHashes[fileName] = {
        hash: this.hashContent(content),
        path: `src/modules/${moduleName}/${fileName}`,
      };
    }

    manifest.files = fileHashes;
    manifest.updatedAt = new Date();

    const manifestPath = path.join(this.manifestsDir, `${moduleName}.json`);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }
}
