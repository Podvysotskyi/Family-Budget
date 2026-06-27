import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSubscriptionAmount1782450100000 implements MigrationInterface {
  name = 'AddSubscriptionAmount1782450100000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD "amount" numeric(12,2) NOT NULL DEFAULT '0'`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "amount"`)
  }
}
