import { defineConfig } from 'vitest/config'

const project = (name: string, include: string[]) => ({
  test: {
    name,
    environment: 'node',
    include,
    restoreMocks: true
  }
})

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: '../../coverage/apps/api',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/modules/database/migrations/**'],
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50
      }
    },
    projects: [
      project('api-unit', ['tests/unit/**/*.spec.ts']),
      project('api-feature', ['tests/feature/**/*.feature-spec.ts'])
    ]
  }
})
