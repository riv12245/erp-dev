const baseConfig = require('./jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'e2e',
  testMatch: ['**/tests/e2e/**/*.test.ts'],
  coverageDirectory: 'coverage/e2e',
  testTimeout: 60000,
  globalSetup: './tests/e2e/setup.ts',
};
