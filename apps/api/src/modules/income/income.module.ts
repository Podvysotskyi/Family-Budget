import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { IncomeEntity } from './entities/income.entity'
import { IncomeRepository } from './income.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IncomeEntity
    ])
  ],
  providers: [
    IncomeRepository
  ],
  exports: [
    IncomeRepository
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class IncomeModule {}
