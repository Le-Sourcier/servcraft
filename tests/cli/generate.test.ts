import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('servcraft generate', () => {
  const cliPath = './dist/cli/index.js';

  it('should generate controller with dry-run', () => {
    const uniqueName = 'testuser' + Date.now();
    const output = execSync(`node ${cliPath} generate controller ${uniqueName} --dry-run`, {
      encoding: 'utf-8',
    });

    expect(output).toContain('DRY RUN MODE');
    expect(output).toContain(`${uniqueName}.controller.ts`);
    expect(output).toContain('Total operations');
  });

  it('should generate service with dry-run', () => {
    const uniqueName = 'testproduct' + Date.now();
    const output = execSync(`node ${cliPath} g s ${uniqueName} --dry-run`, {
      encoding: 'utf-8',
    });

    expect(output).toContain('DRY RUN MODE');
    expect(output).toContain(`${uniqueName}.service.ts`);
  });

  it('should generate module with dry-run', () => {
    const uniqueName = 'testorder' + Date.now();
    const output = execSync(`node ${cliPath} g m ${uniqueName} --dry-run`, {
      encoding: 'utf-8',
    });

    expect(output).toContain('DRY RUN MODE');
    expect(output).toContain(`${uniqueName}.controller.ts`);
    expect(output).toContain(`${uniqueName}.service.ts`);
    expect(output).toContain(`${uniqueName}.routes.ts`);
  });
});
