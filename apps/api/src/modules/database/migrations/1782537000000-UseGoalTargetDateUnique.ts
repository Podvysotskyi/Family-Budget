import type { MigrationInterface, QueryRunner } from 'typeorm'

export class UseGoalTargetDateUnique1782537000000 implements MigrationInterface {
  name = 'UseGoalTargetDateUnique1782537000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "goal_targets"
      WHERE "id" IN (
        SELECT "id"
        FROM (
          SELECT
            "id",
            ROW_NUMBER() OVER (
              PARTITION BY "goal_id", "date"
              ORDER BY "updated_at" DESC, "created_at" DESC, "id" DESC
            ) AS "target_order"
          FROM "goal_targets"
        ) "duplicate_targets"
        WHERE "target_order" > 1
      )
    `)
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."goal_targets_goal_date_type_unique"`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "goal_targets_goal_date_unique" ON "goal_targets" ("goal_id", "date")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."goal_targets_goal_date_unique"`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "goal_targets_goal_date_type_unique" ON "goal_targets" ("goal_id", "date", "type")`)
  }
}
