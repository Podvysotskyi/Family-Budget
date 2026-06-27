import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SubscriptionTransactionEntity } from './entities/subscription-transaction.entity'
import { SubscriptionEntity } from './entities/subscription.entity'
import { SubscriptionsRepository } from './subscriptions.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionTransactionEntity,
      SubscriptionEntity
    ])
  ],
  providers: [
    SubscriptionsRepository
  ],
  exports: [
    SubscriptionsRepository
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SubscriptionsModule {}
