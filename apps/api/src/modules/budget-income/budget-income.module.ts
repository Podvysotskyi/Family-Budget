import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BudgetIncomeEntity } from './entities/budget-income.entity'
import { BudgetIncomeRepository } from './budget-income.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BudgetIncomeEntity
    ])
  ],
  providers: [
    BudgetIncomeRepository
  ],
  exports: [
    BudgetIncomeRepository
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class BudgetIncomeModule {}
