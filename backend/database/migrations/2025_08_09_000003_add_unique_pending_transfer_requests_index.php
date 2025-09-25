<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Create a unique index for pending transfer requests per (initiator_user_id, placement_request_id)
        // SQLite used in local tests doesn't support partial indexes the same way as PostgreSQL,
        // so we guard with raw SQL only when supported.
        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_tr_on_user_and_placement ON transfer_requests (initiator_user_id, placement_request_id) WHERE status = \'pending\'');
        }
        // For SQLite/MySQL, rely on application-level 409 checks added in controller.
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS uniq_pending_tr_on_user_and_placement');
        }
    }
};
