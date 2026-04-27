<?php

declare(strict_types=1);

use App\Enums\HabitDaySummaryMode;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('habits', function (Blueprint $table): void {
            $table
                ->string('day_summary_mode', 32)
                ->default(HabitDaySummaryMode::AVERAGE_SCORED_PETS->value)
                ->after('scale_max');
        });
    }

    public function down(): void
    {
        Schema::table('habits', function (Blueprint $table): void {
            $table->dropColumn('day_summary_mode');
        });
    }
};
