<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add is_active as a computed compatibility column for Postgres-based tests
        // If column already exists (e.g., in older schema), skip
        if (! Schema::hasColumn('email_configurations', 'is_active')) {
            DB::statement("ALTER TABLE email_configurations ADD COLUMN is_active boolean GENERATED ALWAYS AS (CASE WHEN status = 'active' THEN true ELSE false END) STORED");
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('email_configurations', 'is_active')) {
            DB::statement('ALTER TABLE email_configurations DROP COLUMN is_active');
        }
    }
};
