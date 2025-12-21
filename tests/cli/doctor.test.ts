import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('servcraft doctor', () => {
  const cliPath = './dist/cli/index.js';

  it('should run diagnostics', () => {
    const output = execSync(`node ${cliPath} doctor`, { encoding: 'utf-8' });
    expect(output).toContain('ServCraft Doctor');
    expect(output).toContain('Node.js');
    expect(output).toContain('package.json');
  });

  it('should check Node.js version', () => {
    const output = execSync(`node ${cliPath} doctor`, { encoding: 'utf-8' });
    expect(output).toMatch(/Node\.js.*v\d+\.\d+\.\d+/);
  });

  it('should display summary', () => {
    const output = execSync(`node ${cliPath} doctor`, { encoding: 'utf-8' });
    expect(output).toMatch(/\d+ passed/);
  });
});
