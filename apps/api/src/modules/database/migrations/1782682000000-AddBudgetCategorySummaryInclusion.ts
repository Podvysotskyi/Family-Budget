import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBudgetCategorySummaryInclusion1782682000000 implements MigrationInterface {
  name = 'AddBudgetCategorySummaryInclusion1782682000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budget_categories" ADD COLUMN IF NOT EXISTS "in_summary" boolean NOT NULL DEFAULT true`)
    await queryRunner.query(`UPDATE "budget_categories" SET "in_summary" = false WHERE "type" IN ('goals', 'credit_cards')`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budget_categories" DROP COLUMN IF EXISTS "in_summary"`)
  }
}
