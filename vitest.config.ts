import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts', 'i18n/**/*.test.ts'],
        // BRD section 14: unit coverage of at least 70% on domain/ and application/ (npm run test:coverage)
    coverage: {
      provider: 'v8',
      include: ['app/contexts/*/domain/**/*.ts', 'app/contexts/*/application/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: { statements: 70, branches: 70, functions: 70, lines: 70 },
    },
  },
})
