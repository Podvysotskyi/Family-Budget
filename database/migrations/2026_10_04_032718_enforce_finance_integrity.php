<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement('CREATE EXTENSION IF NOT EXISTS btree_gist');
        Schema::table('categories', function (Blueprint $t) {
            $t->uuid('replacement_id')->nullable();
        });
        DB::statement('ALTER TABLE categories ADD FOREIGN KEY (household_id,replacement_id) REFERENCES categories(household_id,id)');
        DB::statement("ALTER TABLE budget_target_periods ADD CONSTRAINT no_overlapping_targets EXCLUDE USING gist (household_id WITH =, category_id WITH =, daterange(start_month,end_month,'[)') WITH &&) WHERE (deleted_at IS NULL)");
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION finance_attachment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.active_claim AND (NOT EXISTS(SELECT 1 FROM occurrences WHERE id=NEW.occurrence_id AND household_id=NEW.household_id AND deleted_at IS NULL) OR NOT EXISTS(SELECT 1 FROM transactions WHERE id=NEW.transaction_id AND household_id=NEW.household_id AND deleted_at IS NULL)) THEN RAISE EXCEPTION 'Cannot claim an unavailable record'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER attachment_guard BEFORE INSERT OR UPDATE ON occurrence_transaction_links FOR EACH ROW EXECUTE FUNCTION finance_attachment_guard();
CREATE OR REPLACE FUNCTION finance_cancel_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.cancel_date IS NOT NULL AND NEW.cancel_date IS DISTINCT FROM OLD.cancel_date THEN RAISE EXCEPTION 'Cancellation date is final'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER cancel_guard BEFORE UPDATE ON scheduled_series FOR EACH ROW EXECUTE FUNCTION finance_cancel_guard();
CREATE OR REPLACE FUNCTION finance_owner_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM households h LEFT JOIN household_members m ON m.id=h.owner_member_id AND m.household_id=h.id WHERE h.deleted_at IS NULL AND (m.id IS NULL OR m.deleted_at IS NOT NULL OR m.user_id IS NULL)) THEN RAISE EXCEPTION 'A live household requires a linked active owner'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER household_owner_guard AFTER INSERT OR UPDATE ON households DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance_owner_guard();
CREATE CONSTRAINT TRIGGER member_owner_guard AFTER UPDATE OR DELETE ON household_members DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance_owner_guard();
SQL);
    }

    public function down(): void
    {
        throw new RuntimeException('Use a reviewed backup to restore finance history.');
    }
};
