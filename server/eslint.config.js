import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Layer rules follow ARCHITECTURE_DESIGN.md Sections 7.2 and 7.4, and TD-049.
// A layer lists only what it MAY import; everything else is rejected.
// Inside src/modules/<module>, a file's layer comes from its suffix: <module>.<layer>.ts.
const layer = (...categories) => ({ file: { categories } });
const ownModule = (...categories) => ({
  file: { categories },
  element: { type: 'module', captured: { name: '{{ from.element.captured.name }}' } },
});
const shared = (...types) => ({ element: { type: types } });

const policies = [
  {
    from: layer('routes'),
    allow: [{ to: ownModule('controller', 'schema') }, { to: shared('middleware', 'utils') }],
  },
  {
    from: layer('controller'),
    allow: [{ to: ownModule('service', 'mappers', 'schema') }, { to: shared('utils') }],
  },
  {
    // A service may call other modules' services, never their repositories or models.
    from: layer('service'),
    allow: [
      { to: ownModule('repository') },
      { to: layer('service') },
      { to: shared('gateway', 'utils', 'config') },
    ],
  },
  {
    from: layer('repository'),
    allow: [{ to: ownModule('model') }, { to: shared('utils') }],
  },
  { from: layer('model', 'mappers', 'schema'), allow: [{ to: shared('utils') }] },
  {
    from: shared('middleware'),
    allow: [{ to: layer('service') }, { to: shared('utils', 'config') }],
  },
  { from: shared('gateway'), allow: [{ to: shared('utils', 'config') }] },
  { from: shared('utils'), allow: [] },
  { from: shared('config'), allow: [] },
];

export default defineConfig([
  globalIgnores(['dist', 'coverage']),

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: { globals: globals.node },
  },

  {
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      // Patterns are relative to this folder, wherever ESLint is started from (for example the git hook).
      'boundaries/root-path': import.meta.dirname,
      'import/resolver': {
        typescript: {
          project: `${import.meta.dirname}/tsconfig.json`,
          conditionNames: ['source', 'import', 'node'],
        },
      },
      'boundaries/elements': [
        { type: 'module', pattern: 'src/modules/*', capture: ['name'] },
        { type: 'middleware', pattern: 'src/middleware' },
        { type: 'gateway', pattern: 'src/gateways' },
        { type: 'utils', pattern: 'src/utils' },
        { type: 'config', pattern: 'src/config' },
      ],
      'boundaries/files': [
        { category: 'routes', pattern: '**/*.routes.ts' },
        { category: 'controller', pattern: '**/*.controller.ts' },
        { category: 'service', pattern: '**/*.service.ts' },
        { category: 'repository', pattern: '**/*.repository.ts' },
        { category: 'model', pattern: '**/*.model.ts' },
        { category: 'mappers', pattern: '**/*.mappers.ts' },
        { category: 'schema', pattern: '**/*.schema.ts' },
      ],
    },
    rules: {
      'boundaries/dependencies': ['error', { default: 'disallow', checkInternals: true, policies }],

      // Only the media gateway may import the media service SDK (ARCHITECTURE_DESIGN.md 7.4).
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'cloudinary',
              message: 'Only the media gateway (src/gateways/media) may import the media SDK.',
            },
          ],
          patterns: [
            {
              group: ['cloudinary/*'],
              message: 'Only the media gateway (src/gateways/media) may import the media SDK.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/gateways/media/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
