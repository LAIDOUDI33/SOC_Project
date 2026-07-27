/**
 * National SOC Platform - Jest Test Configuration
 * 
 * For running: npx jest
 * Coverage: npx jest --coverage
 */

import type { Config } from 'jest';

const config: Config = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directory for tests
  roots: ['<rootDir>/src'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.(ts|tsx)',
    '**/*.{test,spec}.{ts,tsx}',
  ],
  
  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  
  // TypeScript transformation
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  // Module path aliases (matching tsconfig.json)
  // Note: Must use absolute path resolution for Jest
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Ignore patterns for transformation
  transformIgnorePatterns: [
    'node_modules/(?!(next|@next|@node-saml/node-saml|ldapts|jose)/)',
  ],
  
  // Test timeout (10 seconds default)
  testTimeout: 10000,
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/app/**/*.{ts,tsx}',
    'src/lib/**/*.{ts,tsx}',
    'src/components/**/*.{ts,tsx}',
  ],
  
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/',
    '/__tests__/',
    '*.d.ts',
    '*.config.*',
  ],
  
  // Coverage thresholds (minimum requirements)
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 30,
      lines: 40,
      statements: 40,
    },
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Verbose output
  verbose: true,
  
  // Fail on warnings
  errorOnDeprecated: true,
};

export default config;
