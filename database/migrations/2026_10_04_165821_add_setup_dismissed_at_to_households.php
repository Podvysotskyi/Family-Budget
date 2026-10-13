<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('households', function (Blueprint $table) {
            $table->timestampTz('setup_dismissed_at')->nullable();
        });
        Schema::table('connections', function (Blueprint $table) {
            $table->uuid('member_id')->nullable();
            $table->foreign(['household_id', 'member_id'])->references(['household_id', 'id'])->on('household_members');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('connections', function (Blueprint $table) {
            $table->dropForeign(['household_id', 'member_id']);
            $table->dropColumn('member_id');
        });
        Schema::table('households', function (Blueprint $table) {
            $table->dropColumn('setup_dismissed_at');
        });
    }
};
