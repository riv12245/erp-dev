import parser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

// TypeScript's strict compiler handles types/unused locals; lint adds runtime correctness checks.
export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.turbo/**', '**/coverage/**', '**/test/**', '**/tests/**', '**/*.config.*', '**/jest.setup.ts'] },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs'],
    languageOptions: { parser, ecmaVersion: 'latest', sourceType: 'module' },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      'no-debugger': 'error', 'no-duplicate-case': 'error', 'no-unsafe-finally': 'error',
      'no-constant-condition': 'error', 'no-dupe-args': 'error', 'no-sparse-arrays': 'error',
      'valid-typeof': 'error', 'constructor-super': 'error',
      '@typescript-eslint/no-misused-new': 'error', '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
    },
  },
];
