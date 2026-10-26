import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Layer rules follow ARCHITECTURE_DESIGN.md Section 6.1 and TD-049.
// A layer lists only what it MAY import; everything else is rejected.
const layers = {
  app: ['routing', 'layout', 'feature', 'shared-ui', 'data-access', 'state', 'utils', 'config'],
  routing: ['feature', 'layout'],
  layout: ['shared-ui'],
  feature: ['shared-ui', 'data-access', 'state', 'utils'],
  'shared-ui': ['utils'],
  'data-access': ['utils', 'config'],
  state: ['utils'],
  utils: [],
  config: [],
};

export default defineConfig([
  globalIgnores(['dist', 'coverage']),

  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      // Patterns are relative to this folder, wherever ESLint is started from (for example the git hook).
      'boundaries/root-path': import.meta.dirname,
      'import/resolver': {
        typescript: { project: `${import.meta.dirname}/tsconfig.app.json` },
      },
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'routing', pattern: 'src/routing' },
        { type: 'layout', pattern: 'src/layouts' },
        // A feature is the folder src/features/<group>/<name>. Its files may import each other freely.
        {
          type: 'feature',
          pattern: 'src/features/*/*',
          capture: ['group', 'name'],
        },
        { type: 'shared-ui', pattern: 'src/shared-ui' },
        { type: 'data-access', pattern: 'src/data-access' },
        { type: 'state', pattern: 'src/state' },
        { type: 'utils', pattern: 'src/utils' },
        { type: 'config', pattern: 'src/config' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: Object.entries(layers).map(([from, allowed]) => ({
            from: { element: { type: from } },
            allow: { to: { element: { type: allowed } } },
          })),
        },
      ],
    },
  },
]);
