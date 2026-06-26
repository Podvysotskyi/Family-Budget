import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBudgetActiveState1782445618258 implements MigrationInterface {
  name = 'AddBudgetActiveState1782445618258'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budgets" ADD "is_active" boolean NOT NULL DEFAULT false`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budgets" DROP COLUMN "is_active"`)
  }
}
