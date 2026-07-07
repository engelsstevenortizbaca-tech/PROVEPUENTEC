// ESLint (flat config) — https://eslint.org/docs/latest/use/configure/
// Configuración unificada para el cliente (React) y el servidor (Node.js).

import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Rutas que ESLint no debe analizar.
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'client/dist/**',
      'server/dist/**',
      'coverage/**',
    ],
  },

  // Reglas recomendadas base de JavaScript.
  js.configs.recommended,

  // Cliente: React + hooks + accesibilidad (entorno navegador).
  {
    files: ['client/**/*.{js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      // Con React 17+ / Vite no es necesario importar React en cada archivo.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },

  // Servidor: Node.js (entorno node).
  {
    files: ['server/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // Debe ir al final: desactiva las reglas de ESLint que chocan con Prettier.
  prettierConfig,
];
