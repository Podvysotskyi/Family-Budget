import 'dotenv/config'
import { DataSource } from 'typeorm'
import { createDatabaseOptions } from './database.config'

const AppDataSource = new DataSource(createDatabaseOptions({
  url: process.env.DATABASE_URL
}))

export default AppDataSource
