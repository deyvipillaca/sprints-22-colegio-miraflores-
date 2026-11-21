export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/sprint2/*.test.mjs'],
  transform: {},
  testTimeout: 30000,
  coverageProvider: 'v8',
  collectCoverageFrom: ['local/**/*.mjs'],
  coverageDirectory: 'coverage/sprint2',
  coverageReporters: ['text', 'json-summary', 'lcov', 'html'],
};
