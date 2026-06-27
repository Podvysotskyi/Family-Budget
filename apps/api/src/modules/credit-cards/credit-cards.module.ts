import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CreditCardBalanceEntity } from './entities/credit-card-balance.entity'
import { CreditCardLimitEntity } from './entities/credit-card-limit.entity'
import { CreditCardEntity } from './entities/credit-card.entity'
import { CreditCardsRepository } from './credit-cards.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CreditCardBalanceEntity,
      CreditCardEntity,
      CreditCardLimitEntity
    ])
  ],
  providers: [
    CreditCardsRepository
  ],
  exports: [
    CreditCardsRepository
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CreditCardsModule {}
