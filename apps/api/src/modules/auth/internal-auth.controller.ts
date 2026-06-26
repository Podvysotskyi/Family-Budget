import { Body, Controller, Headers, Inject, Post, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'
import type { GoogleProfileDto } from './dto/google-profile.dto'

@Controller('internal/auth')
export class InternalAuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('google')
  async signInWithGoogle(
    @Headers('x-family-budget-internal-secret') internalSecret: string | undefined,
    @Body() profile: GoogleProfileDto
  ) {
    if (!internalSecret || internalSecret !== getInternalApiSecret()) {
      throw new UnauthorizedException('Unauthorized')
    }

    return {
      user: await this.authService.signInWithGoogle(profile)
    }
  }
}

function getInternalApiSecret() {
  return process.env.INTERNAL_API_SECRET
    || process.env.SESSION_SECRET
    || process.env.NUXT_SESSION_PASSWORD
    || 'replace-with-at-least-32-characters'
}
