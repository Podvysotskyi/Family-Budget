import { Module } from '@nestjs/common'
import { HouseholdsModule } from '../households/households.module'
import { UsersModule } from '../users/users.module'
import { AuthService } from './auth.service'
import { InternalAuthController } from './internal-auth.controller'

@Module({
  imports: [
    HouseholdsModule,
    UsersModule
  ],
  controllers: [
    InternalAuthController
  ],
  providers: [
    AuthService
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthModule {}
