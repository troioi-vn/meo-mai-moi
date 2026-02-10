<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('helper_profile_city', function (Blueprint $table) {
            $table->id();
            $table->foreignId('helper_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('city_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['helper_profile_id', 'city_id']);
        });

        // Migrate existing data
        $helperProfiles = DB::table('helper_profiles')->whereNotNull('city_id')->get();
        foreach ($helperProfiles as $profile) {
            DB::table('helper_profile_city')->insert([
                'helper_profile_id' => $profile->id,
                'city_id' => $profile->city_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('helper_profile_city');
    }
};
