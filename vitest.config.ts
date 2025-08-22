// vitest.config.ts (根目录)
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'threads',
    // 使用绝对路径
    setupFiles: resolve(__dirname, 'scripts/setup.vitest.ts'),
  },
});