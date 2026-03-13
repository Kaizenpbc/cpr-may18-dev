/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/backend/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: [
    '<rootDir>/backend/src/tests/e2e/',
    '<rootDir>/node_modules/',
    '<rootDir>/backend/node_modules/',
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'backend/tsconfig.test.json',
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'backend/src/**/*.{ts}',
    '!backend/src/**/*.d.ts',
    '!backend/src/tests/**/*',
  ],
  verbose: true,
  testTimeout: 10000,
  forceExit: true,
};
