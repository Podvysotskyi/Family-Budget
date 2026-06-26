import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { createDatabaseOptions } from './database.config'

const databaseConfig = createDatabaseOptions({
  url: process.env.DATABASE_URL
})

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig)
  ]
})
// Nest modules are intentionally marker classes decorated with @Module.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DatabaseModule {}
