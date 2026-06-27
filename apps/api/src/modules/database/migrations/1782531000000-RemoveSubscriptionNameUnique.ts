import type { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveSubscriptionNameUnique1782531000000 implements MigrationInterface {
  name = 'RemoveSubscriptionNameUnique1782531000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."subscriptions_household_name_user_unique"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."subscriptions_household_name_unassigned_unique"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE UNIQUE INDEX "subscriptions_household_name_unassigned_unique" ON "subscriptions" ("household_id", "name") WHERE "user_id" IS NULL`)
    await queryRunner.query(`CREATE UNIQUE INDEX "subscriptions_household_name_user_unique" ON "subscriptions" ("household_id", "name", "user_id") WHERE "user_id" IS NOT NULL`)
  }
}
