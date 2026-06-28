import type { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameSubscriptionDatesToSubscriptionDueDates1782678143000 implements MigrationInterface {
  name = 'RenameSubscriptionDatesToSubscriptionDueDates1782678143000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscription_dates"
      RENAME TO "subscription_due_dates"
    `)
    await queryRunner.query(`
      ALTER TABLE "subscription_due_dates"
      RENAME CONSTRAINT "PK_subscription_dates_subscription_date" TO "PK_subscription_due_dates_subscription_date"
    `)
    await queryRunner.query(`
      ALTER INDEX "subscription_dates_date_idx"
      RENAME TO "subscription_due_dates_date_idx"
    `)
    await queryRunner.query(`
      ALTER INDEX "subscription_dates_subscription_id_idx"
      RENAME TO "subscription_due_dates_subscription_id_idx"
    `)
    await queryRunner.query(`
      ALTER TABLE "subscription_due_dates"
      RENAME CONSTRAINT "FK_subscription_dates_subscription_id" TO "FK_subscription_due_dates_subscription_id"
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscription_due_dates"
      RENAME CONSTRAINT "FK_subscription_due_dates_subscription_id" TO "FK_subscription_dates_subscription_id"
    `)
    await queryRunner.query(`
      ALTER INDEX "subscription_due_dates_subscription_id_idx"
      RENAME TO "subscription_dates_subscription_id_idx"
    `)
    await queryRunner.query(`
      ALTER INDEX "subscription_due_dates_date_idx"
      RENAME TO "subscription_dates_date_idx"
    `)
    await queryRunner.query(`
      ALTER TABLE "subscription_due_dates"
      RENAME CONSTRAINT "PK_subscription_due_dates_subscription_date" TO "PK_subscription_dates_subscription_date"
    `)
    await queryRunner.query(`
      ALTER TABLE "subscription_due_dates"
      RENAME TO "subscription_dates"
    `)
  }
}
