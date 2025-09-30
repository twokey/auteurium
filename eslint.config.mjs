import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import js from '@eslint/js'
import importPlugin from 'eslint-plugin-import'
import jestPlugin from 'eslint-plugin-jest'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import nodePlugin from 'eslint-plugin-n'
import playwrightPlugin from 'eslint-plugin-playwright'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import reactRefreshPlugin from 'eslint-plugin-react-refresh'
import testingLibraryPlugin from 'eslint-plugin-testing-library'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const PROJECT_ROOT = dirname(fileURLToPath(import.meta.url))
const TYPESCRIPT_GLOBS = ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts']
const JAVASCRIPT_GLOBS = ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs']
const REACT_TEST_GLOBS = ['apps/web/**/*.{test,spec}.{ts,tsx,js,jsx}']
const PLAYWRIGHT_GLOBS = [
  'e2e/**/*.{ts,tsx}',
  'tests/e2e/**/*.{ts,tsx}',
  'tests-examples/**/*.{ts,tsx}'
]
const JEST_TEST_GLOBS = [
  '**/__tests__/**/*.{ts,tsx,js,jsx}',
  '**/*.{test,spec}.{ts,tsx,js,jsx}'
]

const IGNORE_PATTERNS = [
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/cdk.out/**',
  'playwright-report/**',
  'test-results/**',
  '**/*.d.ts',
  'node_modules/**',
  '**/.serverless/**',
  '**/.webpack/**',
  'infrastructure/aws-cdk/lib/**/*.js',
  'infrastructure/aws-cdk/bin/**/*.js',
  'tests-examples/**'
]

const importRecommendedRules = importPlugin.flatConfigs.recommended.rules ?? {}
const importTypeScriptRules = importPlugin.flatConfigs.typescript.rules ?? {}

const sharedImportRuleConfig = {
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
        '**/__tests__/**/*',
        'tests/**/*',
        'e2e/**/*',
        '**/*.config.*',
        '**/vite-env.d.ts',
        'playwright.config.ts'
      ]
    }
  ]
}

export default tseslint.config(
  {
    name: 'ignores',
    ignores: IGNORE_PATTERNS
  },
  {
    name: 'import-resolver',
    settings: {
      'import/resolver': {
        typescript: {
          project: true
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts', '.mjs', '.cjs']
        }
      }
    }
  },
  {
    name: 'typescript-typechecked',
    files: TYPESCRIPT_GLOBS,
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: PROJECT_ROOT
      },
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: {
        ...globals.es2024
      }
    },
    plugins: {
      import: importPlugin
    },
    rules: {
      ...importRecommendedRules,
      ...importTypeScriptRules,
      ...sharedImportRuleConfig,
      'no-console': ['warn', { allow: ['warn', 'error'] }],
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
    name: 'javascript',
    files: JAVASCRIPT_GLOBS,
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: {
        ...globals.es2024
      }
    },
    plugins: {
      import: importPlugin
    },
    rules: {
      ...importRecommendedRules,
      ...sharedImportRuleConfig,
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  {
    name: 'react-app',
    files: ['apps/web/**/*.{ts,tsx,js,jsx}'],
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
      'services/**/*.{ts,tsx,js,jsx}',
      'packages/**/*.{ts,tsx,js,jsx}',
      'infrastructure/**/*.{ts,tsx,js,jsx}',
      'tools/**/*.{ts,tsx,js,jsx}'
    ],
    extends: [nodePlugin.configs['flat/recommended-module']],
    settings: {
      n: {
        tryExtensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts', '.mjs', '.cjs']
      }
    },
    rules: {
      'import/no-default-export': 'warn'
    }
  },
  {
    name: 'jest-tests',
    files: JEST_TEST_GLOBS,
    ignores: PLAYWRIGHT_GLOBS,
    extends: [jestPlugin.configs['flat/recommended']],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
        ...globals.es2024
      }
    }
  },
  {
    name: 'react-testing-library',
    files: REACT_TEST_GLOBS,
    extends: [testingLibraryPlugin.configs['flat/react']]
  },
  {
    name: 'playwright-tests',
    files: PLAYWRIGHT_GLOBS,
    extends: [playwrightPlugin.configs['flat/recommended']],
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
