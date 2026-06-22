/** @type {import('jest').Config} */
const base = require('./jest.config.js');

module.exports = {
  ...base,
  testMatch: ['**/backend/src/tests/platform-flow.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
};
