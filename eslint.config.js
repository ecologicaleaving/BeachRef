// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Design Token Enforcement
    plugins: {
      'local': {
        rules: {
          'no-hardcoded-colors': require('./eslint-rules/no-hardcoded-colors'),
        },
      },
    },
    rules: {
      'local/no-hardcoded-colors': ['warn', {
        allowedFiles: [
          '**/theme/**',
          '**/tokens.ts',
          '**/css-variables.ts',
          '**/__tests__/**',
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/scripts/**',
          '**/eslint-rules/**',
        ],
        allowedColors: [
          // Pure white for specific cases (shadows, overlays)
          '#FFFFFF',
          '#FFF',
          // Pure black for shadows only
          '#000000',
          '#000',
        ],
      }],
    },
  },
]);
