module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  moduleNameMapper: {
    '^@erp/(.*)$': '<rootDir>/packages/$1/src',
    '^@erp/api/(.*)$': '<rootDir>/services/api/src/$1',
  },
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverageFrom: [
    'services/api/src/**/*.ts',
    'packages/**/src/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
};
