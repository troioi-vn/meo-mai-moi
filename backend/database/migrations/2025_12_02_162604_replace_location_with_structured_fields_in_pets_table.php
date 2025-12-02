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
     * Replaces the single 'location' field with structured location fields:
     * - country: ISO 3166-1 alpha-2 code (required)
     * - state: optional
     * - city: optional
     * - address: optional
     */
    public function up(): void
    {
        Schema::table('pets', function (Blueprint $table) {
            // Add new structured location fields after the current location column
            $table->string('country', 2)->nullable()->after('location');
            $table->string('state', 255)->nullable()->after('country');
            $table->string('city', 255)->nullable()->after('state');
            $table->string('address', 255)->nullable()->after('city');
        });

        // Migrate existing location data to city field (best guess)
        DB::statement("UPDATE pets SET city = location WHERE location IS NOT NULL AND location != ''");

        // Set default country for existing records (Vietnam as this is a Vietnamese app)
        DB::statement("UPDATE pets SET country = 'VN' WHERE country IS NULL");

        Schema::table('pets', function (Blueprint $table) {
            // Now make country required and drop the old location column
            $table->string('country', 2)->nullable(false)->change();
            $table->dropColumn('location');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pets', function (Blueprint $table) {
            $table->string('location', 255)->nullable()->after('birthday');
        });

        // Migrate city back to location
        DB::statement("UPDATE pets SET location = city WHERE city IS NOT NULL AND city != ''");

        // Make location required again
        DB::statement("UPDATE pets SET location = '' WHERE location IS NULL");
        Schema::table('pets', function (Blueprint $table) {
            $table->string('location', 255)->nullable(false)->change();
        });

        Schema::table('pets', function (Blueprint $table) {
            $table->dropColumn(['country', 'state', 'city', 'address']);
        });
    }
};
