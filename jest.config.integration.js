const baseConfig = require('./jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'integration',
  testMatch: ['**/tests/integration/**/*.test.ts'],
  coverageDirectory: 'coverage/integration',
  testTimeout: 30000,
};
