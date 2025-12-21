import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('error handling', () => {
  const cliPath = './dist/cli/index.js';

  it('should show helpful error for invalid module', () => {
    try {
      execSync(`node ${cliPath} add invalid-module-xyz`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (err) {
      const error = err as { stdout?: string; stderr?: string };
      const output = error.stdout || error.stderr || '';
      expect(output).toContain('Module "invalid-module-xyz" not found');
      expect(output).toContain('Suggestions');
      expect(output).toContain('servcraft list');
    }
  });

  it('should show error with documentation link', () => {
    try {
      execSync(`node ${cliPath} add nonexistent`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (err) {
      const error = err as { stdout?: string; stderr?: string };
      const output = error.stdout || error.stderr || '';
      expect(output).toContain('Documentation:');
      expect(output).toContain('github.com');
    }
  });
});
