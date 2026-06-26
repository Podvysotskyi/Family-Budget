import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { IncomeTypeEntity } from './entities/income-type.entity'
import { IncomeTypesRepository } from './income-types.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IncomeTypeEntity
    ])
  ],
  providers: [
    IncomeTypesRepository
  ],
  exports: [
    IncomeTypesRepository
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class IncomeTypesModule {}
