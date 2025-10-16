<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('placement_requests', 'is_active')) {
            DB::statement("ALTER TABLE placement_requests ADD COLUMN is_active boolean GENERATED ALWAYS AS (CASE WHEN status = 'open' THEN true ELSE false END) STORED");
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('placement_requests', 'is_active')) {
            DB::statement('ALTER TABLE placement_requests DROP COLUMN is_active');
        }
    }
};
