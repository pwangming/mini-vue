// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom', // 使用 jsdom 模拟浏览器环境
    globals: true,           // 支持全局 describe, it, expect
    setupFiles: './tests/setup.ts' // 可选：测试前运行的文件
  }
})