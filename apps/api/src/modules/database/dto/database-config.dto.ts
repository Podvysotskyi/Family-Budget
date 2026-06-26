import type { DatabaseConfig } from '../interfaces/database-config.interface'

export class DatabaseConfigDto implements DatabaseConfig {
  url?: string
}
