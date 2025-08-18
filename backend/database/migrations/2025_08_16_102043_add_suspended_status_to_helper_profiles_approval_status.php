<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // If table doesn't exist, nothing to do
        if (!Schema::hasTable('helper_profiles')) {
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            // Ensure the column exists; add it if missing to handle older persisted DBs.
            if (!Schema::hasColumn('helper_profiles', 'approval_status')) {
                DB::statement(<<<SQL
                    ALTER TABLE helper_profiles
                    ADD COLUMN approval_status varchar(255) NOT NULL DEFAULT 'pending'
                SQL);
            }
            // On Postgres, Laravel emulates enum with a CHECK constraint on a varchar column.
            // Changing the enum via Schema::change() can generate invalid SQL. Replace the CHECK instead.
            // 1) Drop existing check constraint for approval_status
            $constraintName = null;
            $rows = DB::select(<<<SQL
                SELECT c.conname AS name
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
                WHERE c.contype = 'c'
                  AND t.relname = 'helper_profiles'
                  AND a.attname = 'approval_status'
            SQL);
            if (!empty($rows)) {
                // Prefer a constraint that mentions approval_status, else take the first
                foreach ($rows as $r) {
                    if (isset($r->name) && stripos($r->name, 'approval') !== false) {
                        $constraintName = $r->name;
                        break;
                    }
                }
                if ($constraintName === null) {
                    $constraintName = $rows[0]->name ?? null;
                }
            }

            if ($constraintName) {
                DB::statement('ALTER TABLE helper_profiles DROP CONSTRAINT IF EXISTS "' . $constraintName . '"');
            } else {
                // Best-effort drop by conventional name in case lookup fails
                DB::statement('ALTER TABLE helper_profiles DROP CONSTRAINT IF EXISTS helper_profiles_approval_status_check');
            }

            // 2) Add new CHECK including the new value 'suspended'
            DB::statement(<<<SQL
                ALTER TABLE helper_profiles
                ADD CONSTRAINT helper_profiles_approval_status_check
                CHECK (approval_status IN ('pending','approved','rejected','suspended'))
            SQL);
    } else {
            Schema::table('helper_profiles', function (Blueprint $table) {
                // Non-Postgres (e.g., MySQL) can use enum change directly
                $table->enum('approval_status', ['pending', 'approved', 'rejected', 'suspended'])->default('pending')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('helper_profiles')) {
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            if (!Schema::hasColumn('helper_profiles', 'approval_status')) {
                return; // nothing to revert
            }
            // Revert the Postgres CHECK to exclude 'suspended'
            DB::statement('ALTER TABLE helper_profiles DROP CONSTRAINT IF EXISTS helper_profiles_approval_status_check');
            DB::statement(<<<SQL
                ALTER TABLE helper_profiles
                ADD CONSTRAINT helper_profiles_approval_status_check
                CHECK (approval_status IN ('pending','approved','rejected'))
            SQL);
        } else {
            Schema::table('helper_profiles', function (Blueprint $table) {
                // Revert back to original enum values
                $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('pending')->change();
            });
        }
    }
};
