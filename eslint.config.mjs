import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import reactRefreshPlugin from 'eslint-plugin-react-refresh'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import testingLibraryPlugin from 'eslint-plugin-testing-library'
import playwrightPlugin from 'eslint-plugin-playwright'
import globals from 'globals'

const IGNORE_PATTERNS = [
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/cdk.out/**',
  'playwright-report/**',
  'test-results/**',
  '**/*.d.ts',
  'node_modules/**'
]

const TS_CONFIG_ROOT = dirname(fileURLToPath(import.meta.url))

export default tseslint.config(
  {
    name: 'ignores',
    ignores: IGNORE_PATTERNS
  },
  {
    name: 'base',
    files: ['**/*.{ts,tsx,js,jsx,cjs,mjs}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        tsconfigRootDir: TS_CONFIG_ROOT
      },
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: {
        ...globals.es2024
      }
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'object',
            'type'
          ],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
          pathGroups: [
            { pattern: '@/**', group: 'internal' },
            { pattern: '@shared/**', group: 'internal' }
          ],
          pathGroupsExcludedImportTypes: ['builtin']
        }
      ],
      'import/newline-after-import': ['error', { count: 1 }],
      'import/no-default-export': 'error',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.*',
            '**/*.spec.*',
            '**/tests/**/*',
            '**/__tests__/**/*',
            'e2e/**/*',
            '**/*.config.*',
            '**/vite-env.d.ts',
            'playwright.config.ts'
          ]
        }
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-var-requires': 'off'
    }
  },
  {
    name: 'react-app',
    files: ['apps/web/**/*.{ts,tsx,jsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.browser,
        ...globals.es2024
      }
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
      'jsx-a11y': jsxA11yPlugin
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/no-unescaped-entities': 'off',
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function'
        }
      ],
      'react-refresh/only-export-components': 'warn',
      'import/no-default-export': 'off'
    }
  },
  {
    name: 'node-workspaces',
    files: [
      'services/**/*.{ts,tsx,js}',
      'packages/**/*.{ts,tsx,js}',
      'infrastructure/**/*.{ts,tsx,js}',
      'tools/**/*.{ts,tsx,js}'
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2024
      }
    },
    rules: {
      'import/no-default-export': 'warn'
    }
  },
  {
    name: 'tests',
    files: [
      '**/*.test.{ts,tsx,js}',
      '**/*.spec.{ts,tsx,js}',
      'tests/**/*.{ts,tsx,js}',
      'e2e/**/*.{ts,tsx}'
    ],
    extends: [
      testingLibraryPlugin.configs['flat/react'],
      playwrightPlugin.configs['flat/recommended']
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024
      }
    },
    rules: {
      'import/no-extraneous-dependencies': 'off'
    }
  },
  {
    name: 'config-and-scripts',
    files: ['**/*.config.{js,ts,cjs,mjs}', '**/scripts/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2024
      }
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'import/no-default-export': 'off'
    }
  }
)
