<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('pet_types', 'weight_tracking_allowed')) {
            Schema::table('pet_types', function (Blueprint $table) {
                $table->boolean('weight_tracking_allowed')->default(false)->after('placement_requests_allowed');
            });
        }

        // Ensure cats have weight tracking enabled by default
        try {
            if (Schema::hasColumn('pet_types', 'weight_tracking_allowed')) {
                DB::table('pet_types')
                    ->where('slug', 'cat')
                    ->update(['weight_tracking_allowed' => true]);
            }
        } catch (Throwable $e) {
            // ignore in environments where table/rows may not be ready
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('pet_types', 'weight_tracking_allowed')) {
            Schema::table('pet_types', function (Blueprint $table) {
                $table->dropColumn('weight_tracking_allowed');
            });
        }
    }
};
