<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Create enum type for PostgreSQL if not exists (idempotent check for PG)
        $connection = config('database.default');
        $driver = config("database.connections.$connection.driver");
        if ($driver === 'pgsql') {
            // Check if type already exists
            $exists = DB::select("SELECT 1 FROM pg_type WHERE typname = 'pet_birthday_precision'");
            if (! $exists) {
                DB::statement("CREATE TYPE pet_birthday_precision AS ENUM ('day','month','year','unknown')");
            }
        }

        Schema::table('pets', function (Blueprint $table) use ($driver) {
            // New component columns (nullable)
            $table->smallInteger('birthday_year')->nullable()->after('birthday');
            $table->tinyInteger('birthday_month')->nullable()->after('birthday_year');
            $table->tinyInteger('birthday_day')->nullable()->after('birthday_month');

            if ($driver === 'pgsql') {
                $table->enum('birthday_precision', ['day','month','year','unknown'])
                    ->default('unknown')
                    ->nullable(false)
                    ->using("birthday_precision::pet_birthday_precision")
                    ->after('birthday_day');
            } else {
                $table->enum('birthday_precision', ['day','month','year','unknown'])
                    ->default('unknown')
                    ->after('birthday_day');
            }
        });

        // Make legacy birthday nullable (avoid doctrine/dbal dependency by raw SQL if PG / MySQL)
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE pets ALTER COLUMN birthday DROP NOT NULL');
        } elseif ($driver === 'mysql') {
            // Fetch column type (assuming DATE) and alter
            DB::statement('ALTER TABLE pets MODIFY birthday DATE NULL');
        }

        // Backfill existing rows with precision = day when birthday present
        DB::table('pets')->whereNotNull('birthday')->update([
            'birthday_year' => DB::raw('EXTRACT(YEAR FROM birthday)'),
            'birthday_month' => DB::raw('EXTRACT(MONTH FROM birthday)'),
            'birthday_day' => DB::raw('EXTRACT(DAY FROM birthday)'),
            'birthday_precision' => 'day',
        ]);
    }

    public function down(): void
    {
        $connection = config('database.default');
        $driver = config("database.connections.$connection.driver");

        // Revert nullable change (set NULL birthdays to a fallback or block if exists)
        // We will set any NULL birthdays to '2000-01-01' before making NOT NULL to avoid failure.
        DB::table('pets')->whereNull('birthday')->update(['birthday' => '2000-01-01']);

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE pets ALTER COLUMN birthday SET NOT NULL');
        } elseif ($driver === 'mysql') {
            DB::statement('ALTER TABLE pets MODIFY birthday DATE NOT NULL');
        }

        Schema::table('pets', function (Blueprint $table) {
            $table->dropColumn(['birthday_precision', 'birthday_day', 'birthday_month', 'birthday_year']);
        });

        if ($driver === 'pgsql') {
            DB::statement("DROP TYPE IF EXISTS pet_birthday_precision");
        }
    }
};
