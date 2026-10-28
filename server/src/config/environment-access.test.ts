import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The lint rule `no-restricted-properties` stops `process.env` in editors and in the commit hook.
// This test is the second guard: it also catches the ways the lint rule cannot, such as importing
// the process object under another name, and it fails if someone loosens the rule.
const READS_ENVIRONMENT = [
  /\bprocess\s*(?:\.|\?\.)\s*env\b/,
  /\bprocess\s*\[\s*['"`]env['"`]\s*\]/,
  /\{[^}]*\benv\b[^}]*\}\s*=\s*process\b/,
  /from\s+['"](?:node:)?process['"]/,
  /\brequire\s*\(\s*['"](?:node:)?process['"]\s*\)/,
  /\bimport\s*\(\s*['"](?:node:)?process['"]\s*\)/,
  /\bloadEnvFile\b/,
  /\bgetBuiltinModule\b/,
];

const readsEnvironment = (source: string): boolean =>
  READS_ENVIRONMENT.some((pattern) => pattern.test(source));

describe('the environment-access detector', () => {
  it.each([
    'const port = process.env.PORT;',
    'const port = process?.env.PORT;',
    "const value = process['env'].PORT;",
    'const { env } = process.env;',
    'const { env } = process;',
    'const { exitCode, env: variables } = process;',
    "import process from 'node:process';",
    "import { env } from 'process';",
    "const p = require('node:process');",
    "const p = await import('node:process');",
    "process.loadEnvFile('.env');",
    "const p = process.getBuiltinModule('process');",
  ])('flags: %s', (source) => {
    expect(readsEnvironment(source)).toBe(true);
  });

  it.each([
    "process.stdout.write('line');",
    'process.exitCode = 1;',
    'const { stdout } = process;',
    'process.on("SIGTERM", handler);',
    'const environment = config.runtime.environment;',
    "logger.info('environment_loaded');",
  ])('allows: %s', (source) => {
    expect(readsEnvironment(source)).toBe(false);
  });
});

describe('environment access', () => {
  const sourceFolder = fileURLToPath(new URL('..', import.meta.url));
  const configFolder = join(sourceFolder, 'config') + sep;

  const sourceFiles = (readdirSync(sourceFolder, { recursive: true }) as string[])
    .filter((path) => path.endsWith('.ts'))
    .map((path) => join(sourceFolder, path))
    .filter((path) => !path.startsWith(configFolder));

  it('finds the server source files it is meant to check', () => {
    expect(sourceFiles.length).toBeGreaterThan(5);
    expect(sourceFiles.some((path) => path.endsWith('start-server.ts'))).toBe(true);
  });

  it('is read only by the configuration module', () => {
    const offenders = sourceFiles.filter((path) => readsEnvironment(readFileSync(path, 'utf8')));

    expect(offenders).toEqual([]);
  });
});
