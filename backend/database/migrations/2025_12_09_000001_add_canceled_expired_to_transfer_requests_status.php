<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the old check constraint
        DB::statement('ALTER TABLE transfer_requests DROP CONSTRAINT IF EXISTS transfer_requests_status_check');

        // Add the new check constraint with all valid statuses
        DB::statement("ALTER TABLE transfer_requests ADD CONSTRAINT transfer_requests_status_check CHECK (status::text = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'canceled'::text]))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the new check constraint
        DB::statement('ALTER TABLE transfer_requests DROP CONSTRAINT IF EXISTS transfer_requests_status_check');

        // Restore the old check constraint
        DB::statement("ALTER TABLE transfer_requests ADD CONSTRAINT transfer_requests_status_check CHECK (status::text = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text]))");
    }
};
