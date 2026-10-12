import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup-env.ts'],
    // The specs share one MySQL database and reset its tables.
    fileParallelism: false,
    // Booting the whole application on a cold cache can exceed the defaults.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
