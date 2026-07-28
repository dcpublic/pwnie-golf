import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['server/**/*.js'],
      exclude: ['server/index.js', 'server/db.js'],
      reporter: ['text', 'text-summary'],
    },
  },
});
