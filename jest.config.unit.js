const baseConfig = require('./jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'unit',
  testMatch: ['**/tests/unit/**/*.test.ts'],
  coverageDirectory: 'coverage/unit',
};
