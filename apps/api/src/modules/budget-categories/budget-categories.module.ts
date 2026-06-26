import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BudgetCategoriesRepository } from './budget-categories.repository'
import { BudgetCategoryEntity } from './entities/budget-category.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BudgetCategoryEntity
    ])
  ],
  providers: [
    BudgetCategoriesRepository
  ],
  exports: [
    BudgetCategoriesRepository
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class BudgetCategoriesModule {}
