import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: '../../coverage/apps/web',
      include: ['app/**/*.{ts,vue}'],
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50
      }
    },
    projects: [
      {
        test: {
          name: 'web-unit',
          environment: 'node',
          include: ['test/unit/**/*.spec.ts'],
          restoreMocks: true
        }
      },
      await defineVitestProject({
        test: {
          name: 'web-feature',
          environment: 'nuxt',
          include: ['test/nuxt/**/*.feature.spec.ts'],
          restoreMocks: true,
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom'
            }
          }
        }
      }),
      await defineVitestProject({
        test: {
          name: 'web-e2e',
          environment: 'nuxt',
          include: ['test/e2e/**/*.e2e.spec.ts'],
          globalSetup: ['test/e2e/global-setup.ts'],
          hookTimeout: 120_000,
          testTimeout: 30_000,
          restoreMocks: true,
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom'
            }
          }
        }
      })
    ]
  }
})
