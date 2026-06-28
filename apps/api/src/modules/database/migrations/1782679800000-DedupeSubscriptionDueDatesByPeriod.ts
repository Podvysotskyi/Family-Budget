import type { MigrationInterface, QueryRunner } from 'typeorm'

export class DedupeSubscriptionDueDatesByPeriod1782679800000 implements MigrationInterface {
  name = 'DedupeSubscriptionDueDatesByPeriod1782679800000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH "rankedDueDates" AS (
        SELECT
          "subscriptionDueDate"."subscription_id" AS "subscription_id",
          "subscriptionDueDate"."date" AS "date",
          ROW_NUMBER() OVER (
            PARTITION BY
              "subscriptionDueDate"."subscription_id",
              CASE
                WHEN "subscription"."type" = 'yearly'
                  THEN date_trunc('year', "subscriptionDueDate"."date")::date
                ELSE date_trunc('month', "subscriptionDueDate"."date")::date
              END
            ORDER BY "subscriptionDueDate"."date" DESC
          ) AS "rank"
        FROM "subscription_due_dates" AS "subscriptionDueDate"
        INNER JOIN "subscriptions" AS "subscription"
          ON "subscription"."id" = "subscriptionDueDate"."subscription_id"
      )
      DELETE FROM "subscription_due_dates" AS "subscriptionDueDate"
      USING "rankedDueDates"
      WHERE "subscriptionDueDate"."subscription_id" = "rankedDueDates"."subscription_id"
        AND "subscriptionDueDate"."date" = "rankedDueDates"."date"
        AND "rankedDueDates"."rank" > 1
    `)
  }

  public async down(): Promise<void> {
    // Irreversible: deleted duplicate due-date rows cannot be reconstructed.
  }
}
