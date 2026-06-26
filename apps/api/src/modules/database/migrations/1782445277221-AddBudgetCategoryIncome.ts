import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBudgetCategoryIncome1782445277221 implements MigrationInterface {
  name = 'AddBudgetCategoryIncome1782445277221'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "budget_category_income" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "budget_category_id" uuid NOT NULL, "income_type_id" uuid NOT NULL, "user_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "date" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_51f8985b2bf7aba1cbe7633df40" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "budget_category_income_user_id_idx" ON "budget_category_income" ("user_id")`)
    await queryRunner.query(`CREATE INDEX "budget_category_income_income_type_id_idx" ON "budget_category_income" ("income_type_id")`)
    await queryRunner.query(`CREATE INDEX "budget_category_income_budget_category_id_idx" ON "budget_category_income" ("budget_category_id")`)
    await queryRunner.query(`ALTER TABLE "budget_category_income" ADD CONSTRAINT "FK_01ff4a03cea04ab8bf2801958bf" FOREIGN KEY ("budget_category_id") REFERENCES "budget_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "budget_category_income" ADD CONSTRAINT "FK_f59ee833ee4f1239f1018317410" FOREIGN KEY ("income_type_id") REFERENCES "income_types"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "budget_category_income" ADD CONSTRAINT "FK_c92b91e0fe41d9a0044cf73aafe" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budget_category_income" DROP CONSTRAINT "FK_c92b91e0fe41d9a0044cf73aafe"`)
    await queryRunner.query(`ALTER TABLE "budget_category_income" DROP CONSTRAINT "FK_f59ee833ee4f1239f1018317410"`)
    await queryRunner.query(`ALTER TABLE "budget_category_income" DROP CONSTRAINT "FK_01ff4a03cea04ab8bf2801958bf"`)
    await queryRunner.query(`DROP INDEX "public"."budget_category_income_budget_category_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."budget_category_income_income_type_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."budget_category_income_user_id_idx"`)
    await queryRunner.query(`DROP TABLE "budget_category_income"`)
  }
}
