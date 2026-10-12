import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Booting the whole application on a cold cache can exceed the defaults.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
