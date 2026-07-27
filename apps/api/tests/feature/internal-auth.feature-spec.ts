import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { AuthService } from '../../src/modules/auth/auth.service'
import { InternalAuthController } from '../../src/modules/auth/internal-auth.controller'

describe('POST /internal/auth/google', () => {
  const originalSecret = process.env.INTERNAL_API_SECRET
  const signInWithGoogle = vi.fn()
  let app: INestApplication

  beforeAll(async () => {
    process.env.INTERNAL_API_SECRET = 'test-internal-secret'
    signInWithGoogle.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com'
    })

    const moduleRef = await Test.createTestingModule({
      controllers: [InternalAuthController],
      providers: [{
        provide: AuthService,
        useValue: { signInWithGoogle }
      }]
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    if (originalSecret === undefined) {
      delete process.env.INTERNAL_API_SECRET
    } else {
      process.env.INTERNAL_API_SECRET = originalSecret
    }

    await app.close()
  })

  it('rejects requests without the internal API secret', async () => {
    await request(app.getHttpServer())
      .post('/internal/auth/google')
      .send({ email: 'person@example.com', googleId: 'google-1' })
      .expect(401)

    expect(signInWithGoogle).not.toHaveBeenCalled()
  })

  it('passes an authenticated Google profile to the auth service', async () => {
    const profile = {
      email: 'person@example.com',
      googleId: 'google-1',
      name: 'Person',
      avatarUrl: null
    }

    await request(app.getHttpServer())
      .post('/internal/auth/google')
      .set('x-family-budget-internal-secret', 'test-internal-secret')
      .send(profile)
      .expect(201)
      .expect({
        user: {
          id: 'user-1',
          email: 'person@example.com'
        }
      })

    expect(signInWithGoogle).toHaveBeenCalledWith(profile)
  })
})
