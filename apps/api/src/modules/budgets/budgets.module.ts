import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BudgetsRepository } from './budgets.repository'
import { BudgetEntity } from './entities/budget.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BudgetEntity
    ])
  ],
  providers: [
    BudgetsRepository
  ],
  exports: [
    BudgetsRepository,
    TypeOrmModule
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class BudgetsModule {}
