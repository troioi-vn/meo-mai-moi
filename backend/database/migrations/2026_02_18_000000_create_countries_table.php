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
        Schema::create('countries', function (Blueprint $table) {
            $table->id();
            $table->string('code', 2)->unique();
            $table->string('name', 100);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $codes = DB::table('cities')
            ->select('country')
            ->distinct()
            ->whereNotNull('country')
            ->pluck('country')
            ->filter()
            ->map(fn ($code) => strtoupper((string) $code))
            ->unique()
            ->sort()
            ->values();

        if ($codes->isNotEmpty()) {
            DB::table('countries')->insert(
                $codes->map(fn (string $code): array => [
                    'code' => $code,
                    'name' => $code,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])->all()
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('countries');
    }
};
