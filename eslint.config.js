// Flat ESLint config focusing on TypeScript rules and safe logging
// Nuxt's @nuxt/eslint module provides Vue integration; we add targeted rules here

import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Global ignores (Flat config replacement for .eslintignore)
  {
    ignores: [
      '.nuxt/**',
      'node_modules/**',
      'dist/**',
      '.output/**',
      // Asset CSS files are handled by Tailwind/PostCSS, not ESLint
      'app/assets/**/*.css'
    ]
  },
  // TypeScript source files with project-aware linting
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      // Constitution: Type Safety
      '@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: false }],

      // Constitution: Observable Development (prefer structured logging)
      // Allow only console.warn/error; prefer pino or server logger utilities elsewhere
      'no-console': ['error', { allow: ['warn', 'error'] }]
    }
  },
  // Config files (tailwind, vitest, etc.) - disable project requirement to avoid parser errors
  {
    files: ['*.config.{js,ts,mjs,cjs}', '.config/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: null,
        sourceType: 'module'
      }
    }
  }
]
