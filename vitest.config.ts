import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./test/redactor-setup.js'],
  },
});
