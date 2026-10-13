<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('google_subject')->nullable()->unique();
            $t->string('timezone')->default('America/Chicago');
            $t->string('reminder_local_time', 5)->default('09:00');
            $t->unsignedInteger('reminder_settings_version')->default(1);
        });
        Schema::create('households', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('name');
            $t->uuid('owner_member_id')->nullable();
            $t->unsignedInteger('access_version')->default(1);
            $t->unsignedInteger('data_version')->default(1);
            $t->timestampsTz();
            $t->softDeletesTz();
        });
        Schema::create('household_members', function (Blueprint $t) {
            $this->base($t);
            $t->foreignId('user_id')->nullable()->constrained();
            $t->string('nickname');
            $t->timestampTz('left_at')->nullable();
        });
        DB::statement('CREATE UNIQUE INDEX one_active_household ON household_members(user_id) WHERE deleted_at IS NULL AND user_id IS NOT NULL');
        Schema::create('invitations', function (Blueprint $t) {
            $this->base($t);
            $t->string('target_email');
            $t->uuid('target_member_id')->nullable();
            $t->uuid('invited_by_member_id');
            $t->string('status')->default('pending');
            $t->foreignId('accepted_by_user_id')->nullable()->constrained('users');
            $t->index(['target_email', 'status']);
        });
        Schema::create('categories', function (Blueprint $t) {
            $this->base($t);
            $t->uuid('parent_id')->nullable();
            $t->string('kind');
            $t->string('name');
            $t->string('name_normalized');
            $t->string('system_key')->nullable();
        });
        DB::statement('CREATE UNIQUE INDEX category_root_names ON categories(household_id,name_normalized) WHERE deleted_at IS NULL AND parent_id IS NULL');
        DB::statement('CREATE UNIQUE INDEX category_child_names ON categories(household_id,parent_id,name_normalized) WHERE deleted_at IS NULL AND parent_id IS NOT NULL');
        Schema::create('accounts', function (Blueprint $t) {
            $this->base($t);
            $t->string('name');
            $t->string('type');
            $t->string('source')->default('manual');
            $t->string('institution_name')->nullable();
            $t->uuid('member_id')->nullable();
            $t->text('notes')->nullable();
            $t->bigInteger('balance_cents')->nullable();
            $t->date('balance_date')->nullable();
            $t->timestampTz('balance_observed_at')->nullable();
            $t->uuid('connection_id')->nullable();
            $t->string('provider_account_key')->nullable();
            $t->date('import_start_date')->nullable();
            $t->date('discovery_date')->nullable();
            $t->timestampTz('last_success_at')->nullable();
            $t->string('latest_error')->nullable();
            $t->decimal('apr', 8, 4)->nullable();
            $t->bigInteger('fee_cents')->nullable();
            $t->string('fee_cadence')->nullable();
            $t->unsignedSmallInteger('statement_day')->nullable();
            $t->unsignedSmallInteger('due_day')->nullable();
            $t->uuid('usual_paying_account_id')->nullable();
            $t->date('next_fee_date')->nullable();
        });
        Schema::create('credit_limit_entries', function (Blueprint $t) {
            $this->base($t);
            $t->uuid('account_id');
            $t->date('effective_date');
            $t->bigInteger('limit_cents');
            $t->text('note')->nullable();
        });
        DB::statement('CREATE UNIQUE INDEX card_limit_dates ON credit_limit_entries(account_id,effective_date) WHERE deleted_at IS NULL');
        Schema::create('account_balance_events', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('account_id');
            $t->string('kind');
            $t->bigInteger('balance_cents');
            $t->bigInteger('delta_cents')->nullable();
            $t->date('effective_date');
            $t->uuid('transaction_id')->nullable();
            $t->uuid('loan_payment_id')->nullable();
        });
        Schema::create('scheduled_series', function (Blueprint $t) {
            $this->base($t);
            $t->string('kind');
            $t->string('name');
            $t->bigInteger('amount_cents')->nullable();
            $t->string('frequency');
            $t->date('first_date');
            $t->date('end_date')->nullable();
            $t->unsignedSmallInteger('day_one')->nullable();
            $t->unsignedSmallInteger('day_two')->nullable();
            $t->uuid('category_id')->nullable();
            $t->uuid('member_id')->nullable();
            $t->jsonb('account_ids')->default('[]');
            $t->jsonb('recipient_ids')->default('[]');
            $t->date('cancel_date')->nullable();
            $t->uuid('generated_by_account_id')->nullable();
            $t->string('generated_purpose')->nullable();
            $t->date('generated_through')->nullable();
            $t->date('stop_from')->nullable();
        });
        DB::statement('CREATE UNIQUE INDEX generated_card_series ON scheduled_series(generated_by_account_id,generated_purpose) WHERE deleted_at IS NULL AND generated_by_account_id IS NOT NULL');
        Schema::create('series_revisions', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('series_id');
            $t->unsignedInteger('revision_number');
            $t->integer('anchor_slot');
            $t->jsonb('changes');
            $t->jsonb('rule_snapshot');
            $t->unique(['series_id', 'revision_number']);
        });
        Schema::create('occurrences', function (Blueprint $t) {
            $this->base($t);
            $t->uuid('series_id');
            $t->string('generation_key');
            $t->integer('slot_order');
            $t->date('due_date');
            $t->string('kind');
            $t->string('name');
            $t->bigInteger('amount_cents')->nullable();
            $t->string('status')->default('unpaid');
            $t->date('completed_date')->nullable();
            $t->uuid('category_id')->nullable();
            $t->uuid('member_id')->nullable();
            $t->jsonb('account_ids')->default('[]');
            $t->jsonb('recipient_ids')->default('[]');
            $t->jsonb('overrides')->default('{}');
            $t->integer('reminder_version')->default(1);
            $t->unique(['series_id', 'generation_key']);
            $t->index(['household_id', 'due_date']);
        });
        Schema::create('series_suppression_ranges', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('series_id');
            $t->integer('first_slot');
            $t->integer('last_slot')->nullable();
            $t->string('reason');
        });
        Schema::create('loans', function (Blueprint $t) {
            $this->base($t);
            $t->uuid('account_id')->unique();
            $t->uuid('series_id')->nullable();
            $t->string('tracking_mode')->default('full');
            $t->bigInteger('repayment_total_cents')->nullable();
            $t->bigInteger('installment_cents')->nullable();
            $t->string('lender')->nullable();
            $t->text('notes')->nullable();
        });
        Schema::create('loan_payments', function (Blueprint $t) {
            $this->base($t);
            $t->uuid('loan_id');
            $t->uuid('occurrence_id')->nullable();
            $t->string('kind');
            $t->bigInteger('amount_cents');
            $t->date('payment_date');
            $t->timestampTz('reversed_at')->nullable();
            $t->jsonb('account_ids')->default('[]');
        });
        DB::statement('CREATE UNIQUE INDEX installment_payment_once ON loan_payments(occurrence_id) WHERE deleted_at IS NULL AND reversed_at IS NULL AND occurrence_id IS NOT NULL');
        Schema::create('loan_balance_checkpoints', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('loan_id');
            $t->bigInteger('balance_cents');
            $t->date('effective_date');
            $t->jsonb('included_payment_ids')->default('[]');
            $t->string('state')->default('unreconciled');
        });
        Schema::create('transactions', function (Blueprint $t) {
            $this->base($t);
            $t->uuid('account_id');
            $t->string('source')->default('manual');
            $t->string('status')->default('posted');
            $t->bigInteger('amount_cents');
            $t->date('transaction_date');
            $t->string('payee');
            $t->text('notes')->nullable();
            $t->uuid('category_id')->nullable();
            $t->string('category_origin')->default('member');
            $t->boolean('hidden')->default(false);
            $t->string('provider_classification')->nullable();
            $t->string('manual_classification')->nullable();
            $t->string('deletion_reason')->nullable();
            $t->index(['household_id', 'transaction_date']);
        });
        Schema::create('occurrence_transaction_links', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('occurrence_id');
            $t->uuid('transaction_id');
            $t->uuid('linked_by_member_id');
            $t->boolean('active_claim')->default(true);
            $t->timestampTz('detached_at')->nullable();
        });
        DB::statement('CREATE UNIQUE INDEX one_live_attachment ON occurrence_transaction_links(transaction_id) WHERE active_claim AND detached_at IS NULL');
        Schema::create('budget_target_periods', function (Blueprint $t) {
            $this->base($t);
            $t->uuid('category_id');
            $t->date('start_month');
            $t->date('end_month')->nullable();
            $t->bigInteger('target_cents')->nullable();
        });
        Schema::create('budget_target_overrides', function (Blueprint $t) {
            $this->base($t);
            $t->uuid('category_id');
            $t->date('month');
            $t->bigInteger('target_cents')->nullable();
        });
        DB::statement('CREATE UNIQUE INDEX target_month_override ON budget_target_overrides(category_id,month) WHERE deleted_at IS NULL');
        Schema::create('budget_alerts', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('category_id');
            $t->date('month');
            $t->bigInteger('target_cents');
            $t->bigInteger('spent_cents');
            $t->unique(['household_id', 'category_id', 'month']);
        });
        Schema::create('provider_authorizations', function (Blueprint $t) {
            $this->base($t);
            $t->string('provider_user_key');
            $t->uuid('authorizing_member_id');
            $t->text('access_token');
            $t->text('refresh_token');
            $t->timestampTz('token_expires_at');
            $t->string('state')->default('active');
        });
        Schema::create('connections', function (Blueprint $t) {
            $this->base($t);
            $t->uuid('authorization_id')->nullable();
            $t->string('external_key');
            $t->string('name');
            $t->string('state')->default('active');
            $t->timestampTz('last_full_success_at')->nullable();
            $t->string('latest_error')->nullable();
            $t->integer('lifecycle_version')->default(1);
        });
        Schema::create('provider_resource_bindings', function (Blueprint $t) {
            $this->base($t, false);
            $t->string('provider_user_key');
            $t->string('resource_kind');
            $t->string('external_key');
            $t->unique(['provider_user_key', 'resource_kind', 'external_key']);
        });
        Schema::create('provider_transaction_identities', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('account_id');
            $t->string('external_key');
            $t->uuid('transaction_id');
            $t->unique(['account_id', 'external_key']);
        });
        Schema::create('sync_runs', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('connection_id');
            $t->string('trigger');
            $t->string('hourly_bucket')->nullable();
            $t->string('state')->default('queued');
            $t->timestampTz('started_at')->nullable();
            $t->timestampTz('finished_at')->nullable();
            $t->uuid('lease_token')->nullable();
            $t->timestampTz('lease_expires_at')->nullable();
            $t->string('error')->nullable();
        });
        DB::statement("CREATE UNIQUE INDEX one_running_sync ON sync_runs(connection_id) WHERE state IN ('queued','running')");
        DB::statement('CREATE UNIQUE INDEX hourly_sync_once ON sync_runs(connection_id,hourly_bucket) WHERE hourly_bucket IS NOT NULL');
        Schema::create('sync_account_runs', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('sync_run_id');
            $t->uuid('account_id');
            $t->string('state')->default('pending');
            $t->string('error')->nullable();
            $t->integer('imported_count')->default(0);
            $t->unique(['sync_run_id', 'account_id']);
        });
        Schema::create('account_sync_checkpoints', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('account_id');
            $t->string('stream');
            $t->text('cursor')->nullable();
            $t->date('backfill_from_date')->nullable();
            $t->unique(['account_id', 'stream']);
        });
        Schema::create('provider_identity_conflicts', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('account_id');
            $t->uuid('sync_run_id')->nullable();
            $t->string('reason');
            $t->string('state')->default('unresolved');
        });
        Schema::create('holdings_snapshots', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('account_id');
            $t->timestampTz('observed_at');
            $t->boolean('complete');
            $t->bigInteger('cash_cents')->nullable();
        });
        Schema::create('holding_positions', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('snapshot_id');
            $t->string('security_key');
            $t->string('symbol')->nullable();
            $t->string('description');
            $t->decimal('quantity', 24, 10);
            $t->decimal('unit_price', 24, 10)->nullable();
            $t->bigInteger('market_value_cents')->nullable();
            $t->bigInteger('cost_basis_cents')->nullable();
        });
        Schema::create('investment_activity', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('account_id');
            $t->string('external_key');
            $t->date('activity_date');
            $t->string('kind');
            $t->bigInteger('amount_cents')->nullable();
            $t->uuid('transaction_id')->nullable();
            $t->unique(['account_id', 'external_key']);
        });
        Schema::create('reminder_plans', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('occurrence_id');
            $t->uuid('recipient_member_id');
            $t->foreignId('recipient_user_id')->constrained('users');
            $t->string('fingerprint');
            $t->timestampTz('scheduled_at');
            $t->string('state')->default('scheduled');
            $t->unique(['occurrence_id', 'recipient_member_id', 'fingerprint']);
            $t->index(['state', 'scheduled_at']);
        });
        Schema::create('notifications', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignId('user_id')->constrained();
            $t->uuid('household_id')->nullable();
            $t->string('kind');
            $t->string('deduplication_key')->unique();
            $t->jsonb('data');
            $t->timestampTz('read_at')->nullable();
            $t->timestampTz('dismissed_at')->nullable();
            $t->timestampsTz();
            $t->index(['user_id', 'created_at']);
        });
        Schema::create('reminder_deliveries', function (Blueprint $t) {
            $this->base($t, false);
            $t->uuid('plan_id')->unique();
            $t->uuid('notification_id');
        });
        Schema::create('audit_events', function (Blueprint $t) {
            $this->base($t, false);
            $t->string('subject_type');
            $t->uuid('subject_id');
            $t->foreignId('actor_user_id')->nullable()->constrained('users');
            $t->uuid('actor_member_id')->nullable();
            $t->string('actor_name');
            $t->string('action');
            $t->jsonb('changes');
            $t->index(['household_id', 'subject_type', 'subject_id']);
        });
        Schema::create('outbox_messages', function (Blueprint $t) {
            $this->base($t, false);
            $t->string('kind');
            $t->jsonb('payload');
            $t->timestampTz('published_at')->nullable();
        });
        Schema::create('command_receipts', function (Blueprint $t) {
            $this->base($t, false);
            $t->foreignId('user_id')->constrained();
            $t->uuid('command_key');
            $t->string('payload_hash');
            $t->string('result_id')->nullable();
            $t->unique(['household_id', 'user_id', 'command_key']);
        });
        $this->constraints();
    }

    private function base(Blueprint $t, bool $soft = true): void
    {
        $t->uuid('id')->primary();
        $t->foreignUuid('household_id')->constrained();
        $t->unsignedInteger('lock_version')->default(1);
        $t->timestampsTz();
        if ($soft) {
            $t->softDeletesTz();
        }
        $t->unique(['household_id', 'id']);
    }

    private function constraints(): void
    {
        $relations = [
            ['categories', 'parent_id', 'categories'], ['accounts', 'member_id', 'household_members'], ['accounts', 'usual_paying_account_id', 'accounts'],
            ['credit_limit_entries', 'account_id', 'accounts'], ['account_balance_events', 'account_id', 'accounts'],
            ['scheduled_series', 'category_id', 'categories'], ['scheduled_series', 'member_id', 'household_members'],
            ['series_revisions', 'series_id', 'scheduled_series'], ['occurrences', 'series_id', 'scheduled_series'],
            ['occurrences', 'category_id', 'categories'], ['occurrences', 'member_id', 'household_members'],
            ['series_suppression_ranges', 'series_id', 'scheduled_series'], ['loans', 'account_id', 'accounts'], ['loans', 'series_id', 'scheduled_series'],
            ['loan_payments', 'loan_id', 'loans'], ['loan_payments', 'occurrence_id', 'occurrences'], ['loan_balance_checkpoints', 'loan_id', 'loans'],
            ['transactions', 'account_id', 'accounts'], ['transactions', 'category_id', 'categories'],
            ['occurrence_transaction_links', 'occurrence_id', 'occurrences'], ['occurrence_transaction_links', 'transaction_id', 'transactions'],
            ['budget_target_periods', 'category_id', 'categories'], ['budget_target_overrides', 'category_id', 'categories'], ['budget_alerts', 'category_id', 'categories'],
            ['accounts', 'connection_id', 'connections'], ['connections', 'authorization_id', 'provider_authorizations'],
            ['provider_transaction_identities', 'account_id', 'accounts'], ['provider_transaction_identities', 'transaction_id', 'transactions'],
            ['sync_runs', 'connection_id', 'connections'], ['sync_account_runs', 'sync_run_id', 'sync_runs'], ['sync_account_runs', 'account_id', 'accounts'],
            ['account_sync_checkpoints', 'account_id', 'accounts'], ['holdings_snapshots', 'account_id', 'accounts'], ['holding_positions', 'snapshot_id', 'holdings_snapshots'],
            ['investment_activity', 'account_id', 'accounts'], ['reminder_plans', 'occurrence_id', 'occurrences'], ['reminder_plans', 'recipient_member_id', 'household_members'],
            ['reminder_deliveries', 'plan_id', 'reminder_plans'],
        ];
        foreach ($relations as [$table,$column,$reference]) {
            DB::statement("ALTER TABLE {$table} ADD FOREIGN KEY (household_id,{$column}) REFERENCES {$reference}(household_id,id)");
        }
        DB::statement('ALTER TABLE households ADD FOREIGN KEY (id,owner_member_id) REFERENCES household_members(household_id,id) DEFERRABLE INITIALLY DEFERRED');
        DB::statement("ALTER TABLE categories ADD CHECK (kind IN ('expense','income','transfer'))");
        DB::statement("ALTER TABLE accounts ADD CHECK (source IN ('manual','provider'))");
        DB::statement("ALTER TABLE accounts ADD CHECK (type IN ('cash','checking','savings','credit_card','loan','investment'))");
        DB::statement('ALTER TABLE loan_payments ADD CHECK (amount_cents > 0)');
        DB::statement('ALTER TABLE budget_target_periods ADD CHECK (target_cents IS NULL OR target_cents >= 0)');
        DB::statement('ALTER TABLE budget_target_overrides ADD CHECK (target_cents IS NULL OR target_cents >= 0)');
        DB::statement('ALTER TABLE credit_limit_entries ADD CHECK (limit_cents >= 0)');
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION finance_category_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p categories;
BEGIN
 IF TG_OP='UPDATE' AND OLD.system_key IN ('transfers','loan_payments') AND (NEW.name<>OLD.name OR NEW.deleted_at IS NOT NULL OR NEW.parent_id IS NOT NULL) THEN RAISE EXCEPTION 'Built-in category is protected'; END IF;
 IF TG_OP='UPDATE' AND NEW.kind<>OLD.kind THEN RAISE EXCEPTION 'Category type is immutable'; END IF;
 IF NEW.parent_id IS NOT NULL THEN
  SELECT * INTO p FROM categories WHERE id=NEW.parent_id AND household_id=NEW.household_id;
  IF p.id IS NULL OR p.parent_id IS NOT NULL OR p.kind<>NEW.kind OR p.deleted_at IS NOT NULL OR p.system_key='transfers' OR NEW.parent_id=NEW.id THEN RAISE EXCEPTION 'Invalid category parent'; END IF;
  IF EXISTS(SELECT 1 FROM categories WHERE parent_id=NEW.id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Category with children cannot be nested'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER category_guard BEFORE INSERT OR UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION finance_category_guard();
CREATE OR REPLACE FUNCTION finance_attachment_release() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN UPDATE occurrence_transaction_links SET active_claim=false WHERE occurrence_id=NEW.id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER attachment_release AFTER UPDATE ON occurrences FOR EACH ROW EXECUTE FUNCTION finance_attachment_release();
SQL);
        $tables = ['categories', 'accounts', 'credit_limit_entries', 'account_balance_events', 'scheduled_series', 'series_revisions', 'occurrences', 'series_suppression_ranges', 'loans', 'loan_payments', 'loan_balance_checkpoints', 'transactions', 'occurrence_transaction_links', 'budget_target_periods', 'budget_target_overrides', 'budget_alerts', 'provider_authorizations', 'connections', 'provider_transaction_identities', 'sync_runs', 'sync_account_runs', 'account_sync_checkpoints', 'provider_identity_conflicts', 'holdings_snapshots', 'holding_positions', 'investment_activity', 'reminder_plans', 'reminder_deliveries', 'audit_events', 'outbox_messages', 'command_receipts'];
        foreach ($tables as $table) {
            DB::statement("ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY");
            DB::statement("ALTER TABLE {$table} FORCE ROW LEVEL SECURITY");
            DB::statement("CREATE POLICY tenant_isolation ON {$table} USING (household_id::text = current_setting('app.household_id',true)) WITH CHECK (household_id::text = current_setting('app.household_id',true))");
        }
    }

    public function down(): void
    {
        throw new RuntimeException('Financial history is retained. Restore a reviewed backup instead of destructive rollback.');
    }
};
