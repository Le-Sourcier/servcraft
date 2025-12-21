import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('servcraft list', () => {
  const cliPath = './dist/cli/index.js';

  it('should display available modules', () => {
    const output = execSync(`node ${cliPath} list`, { encoding: 'utf-8' });
    expect(output).toContain('Available Modules');
    expect(output).toContain('Core');
    expect(output).toContain('Security');
  });

  it('should support --json output', () => {
    const output = execSync(`node ${cliPath} list --json`, { encoding: 'utf-8' });
    const data = JSON.parse(output);
    expect(data).toHaveProperty('available');
    expect(Array.isArray(data.available)).toBe(true);
  });

  it('should work with alias ls', () => {
    const output = execSync(`node ${cliPath} ls`, { encoding: 'utf-8' });
    expect(output).toContain('Available Modules');
  });
});
