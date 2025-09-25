<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Skip destructive cleanup when running tests or using SQLite, as dropping
        // columns with existing composite indexes can fail in SQLite during the
        // table-rebuild process used by the schema builder. This migration is a
        // production cleanup and not required for test correctness.
        try {
            $connection = Schema::getConnection();
            $driver = $connection->getDriverName();
        } catch (\Throwable $e) {
            $driver = null;
        }

        if (app()->environment('testing') || $driver === 'sqlite') {
            return; // no-op in testing/sqlite environments
        }

        // Drop cat_id columns from tables if they still exist
        $tablesWithCatId = [
            'placement_requests',
            'transfer_requests',
            'foster_assignments',
            'ownership_history',
            'ownership_transfers',
            'medical_records',
            'weight_histories',
        ];

        foreach ($tablesWithCatId as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'cat_id')) {
                Schema::table($tableName, function (Blueprint $table) {
                    // Drop FK and column in one shot where supported
                    if (method_exists($table, 'dropConstrainedForeignId')) {
                        $table->dropConstrainedForeignId('cat_id');
                    } else {
                        // Fallback: try dropping the foreign key by convention name then the column
                        try {
                            $table->dropForeign([ 'cat_id' ]);
                        } catch (\Throwable $e) {
                            // ignore if FK name differs or not present
                        }
                        $table->dropColumn('cat_id');
                    }
                });
            }
        }

        // Drop legacy cat-specific tables if present
        $legacyTables = [
            'cat_photos',
            'cat_comments',
            'cats',
        ];

        foreach ($legacyTables as $legacy) {
            if (Schema::hasTable($legacy)) {
                Schema::drop($legacy);
            }
        }
    }

    public function down(): void
    {
        // Irreversible cleanup; no-op on down
    }
};
