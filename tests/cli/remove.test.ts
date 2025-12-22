import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('servcraft remove', () => {
  const cliPath = './dist/cli/index.js';

  it('should show error when not in a servcraft project', () => {
    try {
      execSync(`node ${cliPath} remove auth`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (err) {
      const error = err as { stdout?: string; stderr?: string };
      const output = error.stdout || error.stderr || '';
      expect(output).toContain('Failed to validate project');
    }
  });

  it('should show help with --help flag', () => {
    const output = execSync(`node ${cliPath} remove --help`, { encoding: 'utf-8' });
    expect(output).toContain('Remove an installed module');
    expect(output).toContain('--yes');
    expect(output).toContain('--keep-env');
  });

  it('should work with alias rm', () => {
    const output = execSync(`node ${cliPath} rm --help`, { encoding: 'utf-8' });
    expect(output).toContain('Remove an installed module');
  });
});
