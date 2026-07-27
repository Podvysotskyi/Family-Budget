import { UnauthorizedException } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthenticatedRequest } from '../../src/modules/auth/request-user'
import { DashboardController } from '../../src/modules/dashboard/dashboard.controller'
import type { DashboardService } from '../../src/modules/dashboard/dashboard.service'

describe('DashboardController', () => {
  beforeEach(() => {
    vi.stubEnv('INTERNAL_API_SECRET', 'dashboard-test-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('combines the authenticated user with dashboard data', async () => {
    const user = {
      id: 'user-1',
      email: 'person@example.com',
      name: 'Person',
      avatarUrl: null
    }
    const dashboardService = {
      getDashboard: vi.fn().mockResolvedValue({
        household: null,
        members: []
      })
    }
    const controller = new DashboardController(dashboardService as unknown as DashboardService)

    const request = {
      headers: {
        'x-family-budget-internal-secret': 'dashboard-test-secret',
        'x-family-budget-user': Buffer.from(JSON.stringify(user)).toString('base64url')
      }
    } as AuthenticatedRequest

    await expect(controller.dashboard(request)).resolves.toEqual({
      user,
      household: null,
      members: []
    })
    expect(dashboardService.getDashboard).toHaveBeenCalledWith({ userId: user.id })
  })

  it('rejects an unauthenticated request', async () => {
    const controller = new DashboardController({
      getDashboard: vi.fn()
    } as unknown as DashboardService)

    await expect(controller.dashboard({ headers: {} } as AuthenticatedRequest)).rejects.toBeInstanceOf(UnauthorizedException)
  })
})
