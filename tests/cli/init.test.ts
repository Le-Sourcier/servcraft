import { describe, it, expect, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';

describe('servcraft init', () => {
  const cliPath = './dist/cli/index.js';
  const testProjects: string[] = [];

  afterEach(() => {
    testProjects.forEach((dir) => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
    testProjects.length = 0;
  });

  it('should create project structure with --dry-run', () => {
    const projectName = 'test-init-' + Date.now();

    const output = execSync(`node ${cliPath} init ${projectName} --yes --dry-run`, {
      encoding: 'utf-8',
    });

    expect(output).toContain('Servcraft');
    expect(output).toContain('package.json');
    expect(output).toContain('src/');
    expect(output).toContain('DRY RUN MODE');
  });

  it('should support --js flag with dry-run', () => {
    const projectName = 'test-js-' + Date.now();

    const output = execSync(`node ${cliPath} init ${projectName} --yes --js --dry-run`, {
      encoding: 'utf-8',
    });

    expect(output).toContain('package.json');
    expect(output).toContain('DRY RUN MODE');
  });

  it('should support --cjs flag with dry-run', () => {
    const projectName = 'test-cjs-' + Date.now();

    const output = execSync(`node ${cliPath} init ${projectName} --yes --cjs --dry-run`, {
      encoding: 'utf-8',
    });

    expect(output).toContain('package.json');
    expect(output).toContain('DRY RUN MODE');
  });

  it('should support --esm flag with dry-run', () => {
    const projectName = 'test-esm-' + Date.now();

    const output = execSync(`node ${cliPath} init ${projectName} --yes --esm --dry-run`, {
      encoding: 'utf-8',
    });

    expect(output).toContain('package.json');
    expect(output).toContain('module');
  });
});
