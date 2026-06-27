import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GoalTargetEntity } from './entities/goal-target.entity'
import { GoalTransactionEntity } from './entities/goal-transaction.entity'
import { GoalEntity } from './entities/goal.entity'
import { GoalsRepository } from './goals.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GoalEntity,
      GoalTargetEntity,
      GoalTransactionEntity
    ])
  ],
  providers: [
    GoalsRepository
  ],
  exports: [
    GoalsRepository
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GoalsModule {}
