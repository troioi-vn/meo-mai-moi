<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Makes address, city, state, zip_code fields optional in helper_profiles.
     * Changes country to a 2-char ISO code field.
     */
    public function up(): void
    {
        // First, convert existing country names to ISO codes (best effort)
        // For existing data, default to VN if not recognized
        DB::statement("UPDATE helper_profiles SET country = 'VN' WHERE country IS NULL OR length(country) > 2");

        Schema::table('helper_profiles', function (Blueprint $table) {
            // Change country to ISO 2-char code
            $table->string('country', 2)->nullable(false)->change();

            // Make location fields optional
            $table->string('address', 255)->nullable()->change();
            $table->string('city', 255)->nullable()->change();
            $table->string('state', 255)->nullable()->change();
            $table->string('zip_code', 255)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            // Restore original column sizes
            $table->string('country', 255)->nullable()->change();
            $table->string('address', 255)->nullable(false)->change();
            $table->string('city', 255)->nullable(false)->change();
            $table->string('state', 255)->nullable(false)->change();
            $table->string('zip_code', 255)->nullable(false)->change();
        });
    }
};
