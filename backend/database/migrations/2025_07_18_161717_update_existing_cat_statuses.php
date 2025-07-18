<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Enums\CatStatus;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('cats')
            ->where('status', 'available')
            ->update(['status' => CatStatus::ACTIVE->value]);

        DB::table('cats')
            ->where('status', 'fostered')
            ->update(['status' => CatStatus::ACTIVE->value]);

        DB::table('cats')
            ->where('status', 'adopted')
            ->update(['status' => CatStatus::ACTIVE->value]);

        DB::table('cats')
            ->where('status', 'dead')
            ->update(['status' => CatStatus::DECEASED->value]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert 'active' to 'available' (assuming 'active' was the new default for all old statuses)
        DB::table('cats')
            ->where('status', CatStatus::ACTIVE->value)
            ->update(['status' => 'available']);

        // Revert 'deceased' to 'dead'
        DB::table('cats')
            ->where('status', CatStatus::DECEASED->value)
            ->update(['status' => 'dead']);
    }
};