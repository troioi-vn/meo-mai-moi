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
        if (app()->environment('testing')) {
            return;
        }
        DB::table('cats')
            ->where('status', 'available')
            ->update(['status' => 'active']);

        DB::table('cats')
            ->where('status', 'fostered')
            ->update(['status' => 'active']);

        DB::table('cats')
            ->where('status', 'adopted')
            ->update(['status' => 'active']);

        DB::table('cats')
            ->where('status', 'dead')
            ->update(['status' => 'deceased']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (app()->environment('testing')) {
            return;
        }
        // Revert 'active' to 'available' (assuming 'active' was the new default for all old statuses)
        DB::table('cats')
            ->where('status', 'active')
            ->update(['status' => 'available']);

        // Revert 'deceased' to 'dead'
        DB::table('cats')
            ->where('status', 'deceased')
            ->update(['status' => 'dead']);
    }
};
