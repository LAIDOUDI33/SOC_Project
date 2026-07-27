# National SOC Platform - Test Configuration
# For running: npx jest

testEnvironment = node
rootsDir = '<rootDir>/src'
testMatch = ['**/__tests__/**/*.(ts|tsx)', '**/*.{test,spec}.{ts,tsx}']
moduleFileExtensions = ['ts', 'tsx', 'js', 'jsx']
transform = {
  '^.+\\.(ts|tsx)$': ['ts-jest', {
    tsconfig: 'tsconfig.test.json',
  }],
}
setupFilesAfterEnv = ['<rootDir>/jest.setup.ts']
moduleNameMapper = {
  '^@/(.*)$': '<rootDir>/$1',
}
testTimeout = 10000
collectCoverageFrom = [
  'src/app/**/*.{ts,tsx}',
  'src/lib/**/*.{ts,tsx}',
  'src/components/**/*.{ts,tsx}',
]
coveragePathIgnorePatterns = [
  '/node_modules/',
  '/.next/',
  '/coverage/',
]
coverageThreshold = {
  global: {
    branches: 20,
    functions: 30,
    lines: 40,
    statements: 40,
  },
}
