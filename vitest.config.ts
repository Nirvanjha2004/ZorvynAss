import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'finance-backend-test-secret',
      JWT_EXPIRES_IN: '1h',
      NODE_ENV: 'test',
    },
    // Run tests sequentially to avoid DB conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30000,
  },
});
