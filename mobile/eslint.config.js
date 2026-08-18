const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  {
    ignores: [
      'dist/**',
      'dist-*/**',
      '**/dist/**',
      '**/dist-*/**',
      'coverage/**',
      '**/coverage/**',
      '.expo/**',
      '**/.expo/**',
    ],
  },
  expoConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
