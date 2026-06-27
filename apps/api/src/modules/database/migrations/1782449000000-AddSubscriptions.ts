import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSubscriptions1782449000000 implements MigrationInterface {
  name = 'AddSubscriptions1782449000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."subscription_type" AS ENUM('monthly', 'yearly')`)
    await queryRunner.query(`CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "household_id" uuid NOT NULL, "name" text NOT NULL, "user_id" uuid, "type" "public"."subscription_type" NOT NULL, "start_date" date NOT NULL, "end_date" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE UNIQUE INDEX "subscriptions_household_name_unassigned_unique" ON "subscriptions" ("household_id", "name") WHERE "user_id" IS NULL`)
    await queryRunner.query(`CREATE UNIQUE INDEX "subscriptions_household_name_user_unique" ON "subscriptions" ("household_id", "name", "user_id") WHERE "user_id" IS NOT NULL`)
    await queryRunner.query(`CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" ("user_id")`)
    await queryRunner.query(`CREATE INDEX "subscriptions_household_id_idx" ON "subscriptions" ("household_id")`)
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_fdf1e12143795a6f12c62a2337f" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_8157a8e2a6082a20bccd7ef5b9c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_8157a8e2a6082a20bccd7ef5b9c"`)
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_fdf1e12143795a6f12c62a2337f"`)
    await queryRunner.query(`DROP INDEX "public"."subscriptions_household_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."subscriptions_user_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."subscriptions_household_name_user_unique"`)
    await queryRunner.query(`DROP INDEX "public"."subscriptions_household_name_unassigned_unique"`)
    await queryRunner.query(`DROP TABLE "subscriptions"`)
    await queryRunner.query(`DROP TYPE "public"."subscription_type"`)
  }
}
