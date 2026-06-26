import type { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameBudgetIncome1782447093141 implements MigrationInterface {
  name = 'RenameBudgetIncome1782447093141'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budget_category_income" DROP CONSTRAINT "FK_01ff4a03cea04ab8bf2801958bf"`)
    await queryRunner.query(`ALTER TABLE "budget_category_income" RENAME CONSTRAINT "PK_51f8985b2bf7aba1cbe7633df40" TO "PK_f9e291ad319dee0861886d058b2"`)
    await queryRunner.query(`ALTER TABLE "budget_category_income" RENAME CONSTRAINT "FK_f59ee833ee4f1239f1018317410" TO "FK_f4ebc96adbfe445a0f28dbe5250"`)
    await queryRunner.query(`ALTER TABLE "budget_category_income" RENAME CONSTRAINT "FK_c92b91e0fe41d9a0044cf73aafe" TO "FK_a23a776265abbdacefa68877828"`)
    await queryRunner.query(`ALTER TABLE "budget_category_income" RENAME TO "budget_income"`)
    await queryRunner.query(`ALTER TABLE "budget_income" RENAME COLUMN "budget_category_id" TO "budget_id"`)
    await queryRunner.query(`ALTER INDEX "public"."budget_category_income_user_id_idx" RENAME TO "budget_income_user_id_idx"`)
    await queryRunner.query(`ALTER INDEX "public"."budget_category_income_income_type_id_idx" RENAME TO "budget_income_income_type_id_idx"`)
    await queryRunner.query(`ALTER INDEX "public"."budget_category_income_budget_category_id_idx" RENAME TO "budget_income_budget_id_idx"`)
    await queryRunner.query(`ALTER TABLE "budget_income" ADD CONSTRAINT "FK_1f49606e95a6dfc9487ade7651a" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budget_income" DROP CONSTRAINT "FK_1f49606e95a6dfc9487ade7651a"`)
    await queryRunner.query(`ALTER INDEX "public"."budget_income_budget_id_idx" RENAME TO "budget_category_income_budget_category_id_idx"`)
    await queryRunner.query(`ALTER INDEX "public"."budget_income_income_type_id_idx" RENAME TO "budget_category_income_income_type_id_idx"`)
    await queryRunner.query(`ALTER INDEX "public"."budget_income_user_id_idx" RENAME TO "budget_category_income_user_id_idx"`)
    await queryRunner.query(`ALTER TABLE "budget_income" RENAME COLUMN "budget_id" TO "budget_category_id"`)
    await queryRunner.query(`ALTER TABLE "budget_income" RENAME TO "budget_category_income"`)
    await queryRunner.query(`ALTER TABLE "budget_category_income" RENAME CONSTRAINT "PK_f9e291ad319dee0861886d058b2" TO "PK_51f8985b2bf7aba1cbe7633df40"`)
    await queryRunner.query(`ALTER TABLE "budget_category_income" RENAME CONSTRAINT "FK_f4ebc96adbfe445a0f28dbe5250" TO "FK_f59ee833ee4f1239f1018317410"`)
    await queryRunner.query(`ALTER TABLE "budget_category_income" RENAME CONSTRAINT "FK_a23a776265abbdacefa68877828" TO "FK_c92b91e0fe41d9a0044cf73aafe"`)
    await queryRunner.query(`ALTER TABLE "budget_category_income" ADD CONSTRAINT "FK_01ff4a03cea04ab8bf2801958bf" FOREIGN KEY ("budget_category_id") REFERENCES "budget_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
  }
}
