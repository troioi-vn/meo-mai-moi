<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pets', function (Blueprint $table): void {
            $table->string('description_locale', 5)->nullable()->after('description');
        });

        DB::table('pets')
            ->whereNotNull('description')
            ->where('description', '!=', '')
            ->update(['description_locale' => 'en']);
    }

    public function down(): void
    {
        Schema::table('pets', function (Blueprint $table): void {
            $table->dropColumn('description_locale');
        });
    }
};
