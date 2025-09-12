/**
 * Jest configuration for integration tests
 * Story 3.5: Integration Testing & Performance Validation
 */

const path = require('path');
const baseConfig = require('../../../jest.config.js');

module.exports = {
  ...baseConfig,
  // Set root directory to project root
  rootDir: path.resolve(__dirname, '../../../'),
  // Override test environment for integration tests
  testEnvironment: 'node',
  
  // Specific test patterns for integration tests
  testMatch: [
    '**/__tests__/integration/**/*.test.{js,ts}',
  ],
  
  // Longer timeout for integration tests
  testTimeout: 30000,
  
  // Setup file specific to integration tests
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/__tests__/integration/setup/jest.integration.setup.js',
  ],
  
  // Coverage collection for integration tests
  collectCoverageFrom: [
    'services/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'supabase/functions/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  
  // Coverage thresholds for integration tests
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Performance and memory settings for integration tests
  maxWorkers: 2, // Limit parallel workers for database tests
  maxConcurrency: 1, // Run integration tests sequentially
  
  // Transform ignore patterns - include Supabase modules
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|react-native|@react-native|@tanstack)/)',
  ],
  
  // Module name mapping for integration tests
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/$1',
    '^@/services/(.*)$': '<rootDir>/services/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
  },
  
  // Global settings for integration tests
  globals: {
    __DEV__: true,
    'ts-jest': {
      isolatedModules: true,
    },
  },
  
  // Test result formatting
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '__tests__/reports',
      outputName: 'integration-test-results.xml',
      suiteName: 'Integration Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
    }],
  ],
  
  // Verbose output for debugging integration tests
  verbose: true,
};