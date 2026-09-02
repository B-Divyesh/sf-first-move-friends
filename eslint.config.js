import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', '.test-data/**', 'test-results/**', 'playwright-report/**']
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } }
  },
  {
    files: ['**/*.mjs', '*.js'],
    languageOptions: { globals: globals.node }
  },
  {
    files: ['public/sw.js'],
    languageOptions: { globals: globals.serviceworker }
  }
);
