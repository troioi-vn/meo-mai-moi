<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\PetType;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('pet_types', 'microchips_allowed')) {
            Schema::table('pet_types', function (Blueprint $table) {
                $table->boolean('microchips_allowed')->default(false)->after('weight_tracking_allowed');
            });

            // Set microchips_allowed to true for cats by default
            if (Schema::hasColumn('pet_types', 'microchips_allowed')) {
                PetType::where('slug', 'cat')
                    ->update(['microchips_allowed' => true]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('pet_types', 'microchips_allowed')) {
            Schema::table('pet_types', function (Blueprint $table) {
                $table->dropColumn('microchips_allowed');
            });
        }
    }
};