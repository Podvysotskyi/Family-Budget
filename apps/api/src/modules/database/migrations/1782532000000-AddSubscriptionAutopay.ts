import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSubscriptionAutopay1782532000000 implements MigrationInterface {
  name = 'AddSubscriptionAutopay1782532000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "autopay" boolean NOT NULL DEFAULT false`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "autopay"`)
  }
}
