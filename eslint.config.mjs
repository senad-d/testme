import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const typedSourceFiles = [
  'apps/**/*.{ts,tsx,mts,cts}',
  'packages/**/*.{ts,tsx,mts,cts}',
  'tests/**/*.{ts,tsx,mts,cts}',
];

export default tseslint.config(
  {
    name: 'mobey/ignored-artifacts',
    // Generated contracts are generator-owned and must never be hand-edited. ESLint skips
    // their generated implementation, while the repository-wide Prettier check still checks
    // packages/shared/src/generated/api.ts and rejects non-deterministic formatting.
    // Output ignores are anchored to workspace package roots so a source or test directory
    // with the same name remains subject to linting.
    ignores: [
      '.turbo/**',
      '**/node_modules/**',
      'apps/*/{.turbo,.vite,build,coverage,dist,playwright-report,test-results}/**',
      'packages/*/{.turbo,.vite,build,coverage,dist,playwright-report,test-results}/**',
      'tests/e2e/{.turbo,.vite,build,coverage,dist,playwright-report,test-results}/**',
      'packages/shared/src/generated/api.ts',
    ],
  },
  {
    name: 'mobey/linter-options',
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    name: 'mobey/typed-source',
    files: typedSourceFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports', prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/restrict-plus-operands': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='Number']",
          message:
            'Do not coerce values with Number(). Validate ordinary JSON integers explicitly and parse durable money strings with BigInt().',
        },
        {
          selector: 'CallExpression[callee.name=/^(parseFloat|parseInt)$/]',
          message:
            'Numeric string coercion is prohibited. Validate ordinary integers explicitly and parse durable money strings with BigInt().',
        },
        {
          selector:
            "CallExpression[callee.object.name='Number'][callee.property.name=/^(parseFloat|parseInt)$/]",
          message:
            'Numeric string coercion is prohibited. Validate ordinary integers explicitly and parse durable money strings with BigInt().',
        },
        {
          selector: "NewExpression[callee.name='Number']",
          message:
            'Number objects and numeric coercion are prohibited. Durable money uses validated base-10 strings and BigInt().',
        },
        {
          selector: "UnaryExpression[operator='+']",
          message:
            'Unary numeric coercion is prohibited. Validate ordinary integers explicitly and parse durable money strings with BigInt().',
        },
      ],
    },
  },
  {
    ...tseslint.configs.disableTypeChecked,
    name: 'mobey/untyped-javascript',
    files: ['**/*.{js,jsx,mjs,cjs}'],
  },
  {
    name: 'mobey/browser-globals',
    files: ['apps/web/src/**/*.{js,jsx,ts,tsx,mjs,mts}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    name: 'mobey/node-globals',
    files: [
      'eslint.config.mjs',
      'apps/api/**/*.{js,ts,mjs,mts,cjs,cts}',
      'apps/web/*.config.{js,ts,mjs,mts,cjs,cts}',
      'packages/*/test/**/*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
      'packages/**/*.{spec,test}.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
      'tests/e2e/**/*.{js,ts,mjs,mts,cjs,cts}',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  eslintConfigPrettier,
);
