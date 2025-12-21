import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('--dry-run option', () => {
  const cliPath = './dist/cli/index.js';
  const testDir = 'dry-test-' + Date.now();

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should preview init without creating files', () => {
    const output = execSync(`node ${cliPath} init ${testDir} --yes --dry-run`, {
      encoding: 'utf-8',
    });

    expect(output).toContain('DRY RUN MODE');
    expect(output).toContain('Dry Run - Preview of changes');
    expect(output).toContain('package.json');
    expect(output).toContain('Total operations');

    // Check that package.json was not actually created
    const pkgPath = path.join(testDir, 'package.json');
    expect(fs.existsSync(pkgPath)).toBe(false);
  });

  it('should show file count in dry-run', () => {
    const testName = 'test-app-' + Date.now();
    const output = execSync(`node ${cliPath} init ${testName} --yes --dry-run`, {
      encoding: 'utf-8',
    });
    expect(output).toMatch(/Total operations: \d+/);
    expect(output).toMatch(/\d+ create/);
  });
});
