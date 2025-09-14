/** @type {import('jest').Config} */
export default {
  // Use TypeScript preset
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],

  // Test environment
  testEnvironment: 'node',

  // Module resolution
  moduleNameMapping: {
    '^@auteurium/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
    '^@auteurium/validation$': '<rootDir>/../../packages/validation/src/index.ts'
  },

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/*.test.ts'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/types/**'
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],

  // TypeScript configuration
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true
        }
      }
    ]
  },

  // Global test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true
}