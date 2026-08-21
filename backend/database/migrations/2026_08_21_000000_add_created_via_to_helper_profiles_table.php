<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Distinguishes profiles the user filled in from the minimal ones created
     * automatically when they answer a placement request without one.
     *
     * Null for every pre-existing row: those predate the distinction and
     * backfilling them to 'form' would assert something we cannot know.
     */
    public function up(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table): void {
            $table->string('created_via')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table): void {
            $table->dropColumn('created_via');
        });
    }
};
