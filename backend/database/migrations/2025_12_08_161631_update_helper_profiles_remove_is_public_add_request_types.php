<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            // Remove deprecated fields
            $table->dropColumn(['is_public', 'can_foster', 'can_adopt']);

            // Add request_types as JSON array (uses PlacementRequestType enum values)
            $table->json('request_types')->after('has_children');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            // Re-add removed fields
            $table->boolean('is_public')->default(true);
            $table->boolean('can_foster')->default(false);
            $table->boolean('can_adopt')->default(false);

            // Remove request_types
            $table->dropColumn('request_types');
        });
    }
};
