/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  transform: {
    // diagnostics: false — type checking is handled by IDE / tsc --noEmit in CI.
    // This lets tests run even when source files have schema-drift type errors.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json', diagnostics: false }],
  },
  moduleNameMapper: {
    '^@/backend/(.*)$': '<rootDir>/backend/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^server-only$': '<rootDir>/backend/src/tests/__mocks__/server-only.js',
    '^uuid$': '<rootDir>/backend/src/tests/__mocks__/uuid.js',
    '^@mcp-server/(.*)$': '<rootDir>/mcp-server/$1',
  },
  testMatch: ['**/backend/src/tests/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  setupFiles: ['<rootDir>/backend/src/tests/jest.setup.ts'],
  forceExit: true,
};

module.exports = config;
