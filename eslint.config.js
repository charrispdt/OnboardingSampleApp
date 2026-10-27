const js = require('@eslint/js');
const globals = require('globals');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  js.configs.recommended,
  {
    files: [
      'server/**/*.js',
      'scripts/**/*.js',
      'tests/**/*.js',
      '*.config.js',
    ],
    languageOptions: {
      sourceType: 'commonjs',
      ecmaVersion: 'latest',
      globals: { ...globals.node, ...globals.commonjs },
    },
  },
  {
    files: ['client/**/*.{js,jsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: '18' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      // No prop-types dependency in this project
      'react/prop-types': 'off',
    },
  },
];
