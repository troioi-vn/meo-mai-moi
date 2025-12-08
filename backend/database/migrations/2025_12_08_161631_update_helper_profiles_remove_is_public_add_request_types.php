<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Step 1: Add request_types column as nullable first
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->json('request_types')->nullable()->after('has_children');
        });

        // Step 2: Migrate existing data based on can_foster and can_adopt values
        DB::table('helper_profiles')->get()->each(function ($profile) {
            $requestTypes = [];

            if ($profile->can_foster) {
                $requestTypes[] = 'foster_free';
            }
            if ($profile->can_adopt) {
                $requestTypes[] = 'permanent';
            }

            // Default to foster_free if no types were set
            if (empty($requestTypes)) {
                $requestTypes = ['foster_free'];
            }

            DB::table('helper_profiles')
                ->where('id', $profile->id)
                ->update(['request_types' => json_encode($requestTypes)]);
        });

        // Step 3: Make request_types non-nullable and remove deprecated columns
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->json('request_types')->nullable(false)->change();
            $table->dropColumn(['is_public', 'can_foster', 'can_adopt']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Step 1: Re-add removed fields
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->boolean('is_public')->default(true);
            $table->boolean('can_foster')->default(false);
            $table->boolean('can_adopt')->default(false);
        });

        // Step 2: Migrate data back from request_types
        DB::table('helper_profiles')->get()->each(function ($profile) {
            $requestTypes = json_decode($profile->request_types, true) ?? [];

            $canFoster = in_array('foster_free', $requestTypes) || in_array('foster_payed', $requestTypes);
            $canAdopt = in_array('permanent', $requestTypes);

            DB::table('helper_profiles')
                ->where('id', $profile->id)
                ->update([
                    'can_foster' => $canFoster,
                    'can_adopt' => $canAdopt,
                ]);
        });

        // Step 3: Remove request_types
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->dropColumn('request_types');
        });
    }
};
