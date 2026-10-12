const shared = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '\\.css$': '<rootDir>/jest/style-mock.js',
  },
};

// Unit tests live in *.test.ts and component tests in *.test.tsx so CI can
// run and report them as separate steps.
module.exports = {
  projects: [
    {
      ...shared,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.test.ts'],
    },
    {
      ...shared,
      displayName: 'components',
      testMatch: ['<rootDir>/src/**/*.test.tsx'],
    },
  ],
};
