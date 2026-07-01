/**
 * SealProof — Jest Configuration
 *
 * Runs unit tests for all backend services and shared library.
 * Frontend apps use their own jest/vitest configs.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/services/**/*.test.js',
    '<rootDir>/shared/**/*.test.js',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/apps/'],
  collectCoverageFrom: [
    'services/**/src/**/*.js',
    'shared/**/*.js',
    '!shared/db/migrations/**',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  coverageThresholds: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterSetup: ['<rootDir>/tests/setup.js'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 15000,
};
