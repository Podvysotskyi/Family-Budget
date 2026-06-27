import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddGoals1782536000000 implements MigrationInterface {
  name = 'AddGoals1782536000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."goal_target_type" AS ENUM('monthly', 'weekly', 'total')`)
    await queryRunner.query(`CREATE TABLE "goals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "household_id" uuid NOT NULL, "user_id" uuid, "name" text NOT NULL, "start_date" date NOT NULL, "end_date" date, "include_in_budget" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a8a91a431d7b2a2b56cb1d78b80" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "goals_user_id_idx" ON "goals" ("user_id")`)
    await queryRunner.query(`CREATE INDEX "goals_household_id_idx" ON "goals" ("household_id")`)
    await queryRunner.query(`CREATE TABLE "goal_targets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "goal_id" uuid NOT NULL, "date" date NOT NULL, "type" "public"."goal_target_type" NOT NULL, "amount" numeric(12,2) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_602ce5d15f402d5a4fdbfaa011c" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE UNIQUE INDEX "goal_targets_goal_date_type_unique" ON "goal_targets" ("goal_id", "date", "type")`)
    await queryRunner.query(`CREATE INDEX "goal_targets_goal_id_idx" ON "goal_targets" ("goal_id")`)
    await queryRunner.query(`CREATE TABLE "goal_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "goal_id" uuid NOT NULL, "user_id" uuid NOT NULL, "date" date NOT NULL, "amount" numeric(12,2) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a80622400b3f954f61701f93e01" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "goal_transactions_goal_date_idx" ON "goal_transactions" ("goal_id", "date")`)
    await queryRunner.query(`CREATE INDEX "goal_transactions_user_id_idx" ON "goal_transactions" ("user_id")`)
    await queryRunner.query(`CREATE INDEX "goal_transactions_goal_id_idx" ON "goal_transactions" ("goal_id")`)
    await queryRunner.query(`ALTER TABLE "goals" ADD CONSTRAINT "FK_527710c585cb69a5e4cfa610c04" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "goals" ADD CONSTRAINT "FK_88b78010581f2d293699d064441" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "goal_targets" ADD CONSTRAINT "FK_539c19130e05ec39a5867cad4bf" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "goal_transactions" ADD CONSTRAINT "FK_9019c460ba96707d2dcfdf314ce" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "goal_transactions" ADD CONSTRAINT "FK_8e1c777b67760ec99637f4d44da" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "goal_transactions" DROP CONSTRAINT "FK_8e1c777b67760ec99637f4d44da"`)
    await queryRunner.query(`ALTER TABLE "goal_transactions" DROP CONSTRAINT "FK_9019c460ba96707d2dcfdf314ce"`)
    await queryRunner.query(`ALTER TABLE "goal_targets" DROP CONSTRAINT "FK_539c19130e05ec39a5867cad4bf"`)
    await queryRunner.query(`ALTER TABLE "goals" DROP CONSTRAINT "FK_88b78010581f2d293699d064441"`)
    await queryRunner.query(`ALTER TABLE "goals" DROP CONSTRAINT "FK_527710c585cb69a5e4cfa610c04"`)
    await queryRunner.query(`DROP INDEX "public"."goal_transactions_goal_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."goal_transactions_user_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."goal_transactions_goal_date_idx"`)
    await queryRunner.query(`DROP TABLE "goal_transactions"`)
    await queryRunner.query(`DROP INDEX "public"."goal_targets_goal_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."goal_targets_goal_date_type_unique"`)
    await queryRunner.query(`DROP TABLE "goal_targets"`)
    await queryRunner.query(`DROP INDEX "public"."goals_household_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."goals_user_id_idx"`)
    await queryRunner.query(`DROP TABLE "goals"`)
    await queryRunner.query(`DROP TYPE "public"."goal_target_type"`)
  }
}
