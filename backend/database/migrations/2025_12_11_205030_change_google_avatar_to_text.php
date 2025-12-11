<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users ALTER COLUMN google_avatar TYPE TEXT');
        } elseif ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement('ALTER TABLE users MODIFY google_avatar TEXT NULL');
        } else {
            // SQLite doesn't enforce VARCHAR length, so no change needed
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            // Truncate any long values before changing back
            DB::statement('UPDATE users SET google_avatar = LEFT(google_avatar, 255) WHERE LENGTH(google_avatar) > 255');
            DB::statement('ALTER TABLE users ALTER COLUMN google_avatar TYPE VARCHAR(255)');
        } elseif ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement('UPDATE users SET google_avatar = LEFT(google_avatar, 255) WHERE LENGTH(google_avatar) > 255');
            DB::statement('ALTER TABLE users MODIFY google_avatar VARCHAR(255) NULL');
        }
    }
};
