import type { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveSubscriptionParentId1782450200000 implements MigrationInterface {
  name = 'RemoveSubscriptionParentId1782450200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_subscriptions_parent_id"`)
    await queryRunner.query(`DROP INDEX "public"."subscriptions_parent_id_idx"`)
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "parent_id"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD "parent_id" uuid`)
    await queryRunner.query(`CREATE INDEX "subscriptions_parent_id_idx" ON "subscriptions" ("parent_id")`)
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_subscriptions_parent_id" FOREIGN KEY ("parent_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    )
  }
}
