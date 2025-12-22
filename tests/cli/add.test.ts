import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('servcraft add', () => {
  const cliPath = './dist/cli/index.js';

  it('should show error when not in a servcraft project', () => {
    try {
      execSync(`node ${cliPath} add auth`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (err) {
      const error = err as { stdout?: string; stderr?: string };
      const output = error.stdout || error.stderr || '';
      expect(output).toContain('Failed to validate project');
    }
  });

  it('should show error for invalid module name', () => {
    try {
      execSync(`node ${cliPath} add invalid-module-xyz`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (err) {
      const error = err as { stdout?: string; stderr?: string };
      const output = error.stdout || error.stderr || '';
      expect(output).toContain('Module "invalid-module-xyz" not found');
    }
  });

  it('should show help with --help flag', () => {
    const output = execSync(`node ${cliPath} add --help`, { encoding: 'utf-8' });
    expect(output).toContain('Add a pre-built module');
    expect(output).toContain('--dry-run');
  });
});
