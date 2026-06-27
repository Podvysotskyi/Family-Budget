import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSubscriptionAmountAndDateHistory1782535000000 implements MigrationInterface {
  name = 'AddSubscriptionAmountAndDateHistory1782535000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "subscription_amounts" ("subscription_id" uuid NOT NULL, "date" date NOT NULL, "amount" numeric(12,2) NOT NULL, CONSTRAINT "PK_subscription_amounts_subscription_date" PRIMARY KEY ("subscription_id", "date"))`)
    await queryRunner.query(`CREATE INDEX "subscription_amounts_subscription_id_idx" ON "subscription_amounts" ("subscription_id")`)
    await queryRunner.query(`CREATE TABLE "subscription_dates" ("subscription_id" uuid NOT NULL, "date" date NOT NULL, CONSTRAINT "PK_subscription_dates_subscription_date" PRIMARY KEY ("subscription_id", "date"))`)
    await queryRunner.query(`CREATE INDEX "subscription_dates_date_idx" ON "subscription_dates" ("date")`)
    await queryRunner.query(`CREATE INDEX "subscription_dates_subscription_id_idx" ON "subscription_dates" ("subscription_id")`)

    await queryRunner.query(`
      INSERT INTO "subscription_amounts" ("subscription_id", "date", "amount")
      SELECT "id", "start_date", "amount"
      FROM "subscriptions"
      ON CONFLICT ("subscription_id", "date") DO UPDATE SET "amount" = EXCLUDED."amount"
    `)

    await queryRunner.query(`
      INSERT INTO "subscription_dates" ("subscription_id", "date")
      SELECT
        "subscription"."id",
        "occurrence"."date"::date
      FROM "subscriptions" AS "subscription"
      CROSS JOIN LATERAL generate_series(
        "subscription"."start_date",
        (date_trunc('month', CURRENT_DATE)::date + interval '1 month' - interval '1 day')::date,
        interval '1 day'
      ) AS "occurrence"("date")
      WHERE ("subscription"."end_date" IS NULL OR "occurrence"."date"::date <= "subscription"."end_date")
        AND (
          (
            "subscription"."type" = 'monthly'
            AND EXTRACT(DAY FROM "occurrence"."date") = EXTRACT(DAY FROM "subscription"."start_date")
          )
          OR (
            "subscription"."type" = 'yearly'
            AND EXTRACT(MONTH FROM "occurrence"."date") = EXTRACT(MONTH FROM "subscription"."start_date")
            AND EXTRACT(DAY FROM "occurrence"."date") = EXTRACT(DAY FROM "subscription"."start_date")
          )
        )
      ON CONFLICT ("subscription_id", "date") DO NOTHING
    `)

    await queryRunner.query(`ALTER TABLE "subscription_amounts" ADD CONSTRAINT "FK_subscription_amounts_subscription_id" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "subscription_dates" ADD CONSTRAINT "FK_subscription_dates_subscription_id" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "amount"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD "amount" numeric(12,2)`)
    await queryRunner.query(`
      UPDATE "subscriptions" AS "subscription"
      SET "amount" = COALESCE("latestAmount"."amount", 0)
      FROM (
        SELECT DISTINCT ON ("subscription_id")
          "subscription_id",
          "amount"
        FROM "subscription_amounts"
        ORDER BY "subscription_id", "date" DESC
      ) AS "latestAmount"
      WHERE "latestAmount"."subscription_id" = "subscription"."id"
    `)
    await queryRunner.query(`UPDATE "subscriptions" SET "amount" = 0 WHERE "amount" IS NULL`)
    await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "amount" SET NOT NULL`)
    await queryRunner.query(`ALTER TABLE "subscription_dates" DROP CONSTRAINT "FK_subscription_dates_subscription_id"`)
    await queryRunner.query(`ALTER TABLE "subscription_amounts" DROP CONSTRAINT "FK_subscription_amounts_subscription_id"`)
    await queryRunner.query(`DROP INDEX "public"."subscription_dates_subscription_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."subscription_dates_date_idx"`)
    await queryRunner.query(`DROP TABLE "subscription_dates"`)
    await queryRunner.query(`DROP INDEX "public"."subscription_amounts_subscription_id_idx"`)
    await queryRunner.query(`DROP TABLE "subscription_amounts"`)
  }
}
