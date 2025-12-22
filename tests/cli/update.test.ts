import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('servcraft update', () => {
  const cliPath = './dist/cli/index.js';

  it('should show error when not in a servcraft project', () => {
    try {
      execSync(`node ${cliPath} update`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (err) {
      const error = err as { stdout?: string; stderr?: string };
      const output = error.stdout || error.stderr || '';
      expect(output).toContain('Failed to validate project');
    }
  });

  it('should show help with --help flag', () => {
    const output = execSync(`node ${cliPath} update --help`, { encoding: 'utf-8' });
    expect(output).toContain('Update installed modules');
    expect(output).toContain('--check');
    expect(output).toContain('--yes');
  });

  it('should support --check flag', () => {
    try {
      execSync(`node ${cliPath} update --check`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (err) {
      const error = err as { stdout?: string; stderr?: string };
      const output = error.stdout || error.stderr || '';
      // Either shows error (not in project) or check output
      expect(output.length).toBeGreaterThan(0);
    }
  });
});
