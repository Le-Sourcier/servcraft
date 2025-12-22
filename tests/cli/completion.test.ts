import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('servcraft completion', () => {
  const cliPath = './dist/cli/index.js';

  it('should generate bash completion script', () => {
    const output = execSync(`node ${cliPath} completion bash`, { encoding: 'utf-8' });
    expect(output).toContain('_servcraft_completions');
    expect(output).toContain('complete -F _servcraft_completions servcraft');
  });

  it('should generate zsh completion script', () => {
    const output = execSync(`node ${cliPath} completion zsh`, { encoding: 'utf-8' });
    expect(output).toContain('#compdef servcraft');
    expect(output).toContain('_servcraft');
  });

  it('should show error for unsupported shell', () => {
    try {
      execSync(`node ${cliPath} completion fish`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (err) {
      const error = err as { stdout?: string; stderr?: string };
      const output = error.stdout || error.stderr || '';
      expect(output).toContain('Unsupported shell: fish');
      expect(output).toContain('Supported shells: bash, zsh');
    }
  });

  it('should show help with --help flag', () => {
    const output = execSync(`node ${cliPath} completion --help`, { encoding: 'utf-8' });
    expect(output).toContain('Generate shell completion scripts');
    expect(output).toContain('Shell type (bash or zsh)');
  });
});
