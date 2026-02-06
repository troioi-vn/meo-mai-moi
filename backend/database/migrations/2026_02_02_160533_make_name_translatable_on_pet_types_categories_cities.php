<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Tables and columns to make translatable.
     */
    private array $tables = [
        'pet_types' => 'name',
        'categories' => 'name',
        'cities' => 'name',
    ];

    /**
     * Run the migrations.
     *
     * Converts name columns from VARCHAR to JSONB and migrates existing
     * string values to JSON format with 'en' as the default locale.
     */
    public function up(): void
    {
        foreach ($this->tables as $table => $column) {
            // Step 1: Create a temporary column to hold the JSON data
            DB::statement("ALTER TABLE {$table} ADD COLUMN {$column}_json JSONB");

            // Step 2: Migrate existing string values to JSON format {"en": "value"}
            DB::statement("UPDATE {$table} SET {$column}_json = jsonb_build_object('en', {$column})");

            // Step 3: Drop the old string column
            DB::statement("ALTER TABLE {$table} DROP COLUMN {$column}");

            // Step 4: Rename the JSON column to the original name
            DB::statement("ALTER TABLE {$table} RENAME COLUMN {$column}_json TO {$column}");
        }
    }

    /**
     * Reverse the migrations.
     *
     * Converts JSON columns back to VARCHAR, extracting the 'en' locale value.
     */
    public function down(): void
    {
        foreach ($this->tables as $table => $column) {
            // Step 1: Create a temporary column to hold the string data
            DB::statement("ALTER TABLE {$table} ADD COLUMN {$column}_str VARCHAR(255)");

            // Step 2: Extract the 'en' value from JSON (or first available value)
            DB::statement("UPDATE {$table} SET {$column}_str = COALESCE({$column}->>'en', {$column}->>0, '')");

            // Step 3: Drop the JSON column
            DB::statement("ALTER TABLE {$table} DROP COLUMN {$column}");

            // Step 4: Rename the string column to the original name
            DB::statement("ALTER TABLE {$table} RENAME COLUMN {$column}_str TO {$column}");
        }
    }
};
