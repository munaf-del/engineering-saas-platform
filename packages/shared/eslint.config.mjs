import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['dist/**', '.turbo/**', 'coverage/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
];
