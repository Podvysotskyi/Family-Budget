import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameBudgetIncomeToIncome1782448000000 implements MigrationInterface {
  name = 'RenameBudgetIncomeToIncome1782448000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "budget_income" SET "date" = "budgets"."start_date" FROM "budgets" WHERE "budget_income"."budget_id" = "budgets"."id" AND "budget_income"."date" IS NULL`)
    await queryRunner.query(`ALTER TABLE "budget_income" ALTER COLUMN "date" SET NOT NULL`)
    await queryRunner.query(`ALTER TABLE "budget_income" DROP CONSTRAINT "FK_1f49606e95a6dfc9487ade7651a"`)
    await queryRunner.query(`DROP INDEX "public"."budget_income_budget_id_idx"`)
    await queryRunner.query(`ALTER TABLE "budget_income" DROP COLUMN "budget_id"`)
    await queryRunner.query(`ALTER TABLE "budget_income" RENAME TO "income"`)
    await queryRunner.query(`ALTER INDEX "public"."budget_income_income_type_id_idx" RENAME TO "income_income_type_id_idx"`)
    await queryRunner.query(`ALTER INDEX "public"."budget_income_user_id_idx" RENAME TO "income_user_id_idx"`)
    await queryRunner.query(`CREATE INDEX "income_user_date_idx" ON "income" ("user_id", "date")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."income_user_date_idx"`)
    await queryRunner.query(`ALTER INDEX "public"."income_user_id_idx" RENAME TO "budget_income_user_id_idx"`)
    await queryRunner.query(`ALTER INDEX "public"."income_income_type_id_idx" RENAME TO "budget_income_income_type_id_idx"`)
    await queryRunner.query(`ALTER TABLE "income" RENAME TO "budget_income"`)
    await queryRunner.query(`ALTER TABLE "budget_income" ADD "budget_id" uuid`)
    await queryRunner.query(`UPDATE "budget_income" SET "budget_id" = "budgets"."id" FROM "budgets", "users" WHERE "users"."id" = "budget_income"."user_id" AND "budgets"."household_id" = "users"."household_id" AND "budget_income"."date" >= "budgets"."start_date" AND "budget_income"."date" <= "budgets"."end_date" AND "budgets"."type" = 'week'`)
    await queryRunner.query(`ALTER TABLE "budget_income" ALTER COLUMN "budget_id" SET NOT NULL`)
    await queryRunner.query(`CREATE INDEX "budget_income_budget_id_idx" ON "budget_income" ("budget_id")`)
    await queryRunner.query(`ALTER TABLE "budget_income" ADD CONSTRAINT "FK_1f49606e95a6dfc9487ade7651a" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "budget_income" ALTER COLUMN "date" DROP NOT NULL`)
  }
}
