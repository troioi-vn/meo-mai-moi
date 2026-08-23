<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('pet_types', 'supports_litters')) {
            Schema::table('pet_types', function (Blueprint $table): void {
                $table->boolean('supports_litters')->default(false)->after('microchips_allowed');
            });
        }

        Schema::create('litters', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->foreignId('pet_type_id')->constrained('pet_types')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->index('pet_type_id');
            $table->index('created_by');
        });

        if (! Schema::hasColumn('pets', 'litter_id')) {
            Schema::table('pets', function (Blueprint $table): void {
                $table->foreignId('litter_id')->nullable()->after('pet_type_id')->constrained('litters')->nullOnDelete();
                $table->index('litter_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('pets', 'litter_id')) {
            Schema::table('pets', function (Blueprint $table): void {
                $table->dropForeign(['litter_id']);
                $table->dropColumn('litter_id');
            });
        }

        Schema::dropIfExists('litters');

        if (Schema::hasColumn('pet_types', 'supports_litters')) {
            Schema::table('pet_types', function (Blueprint $table): void {
                $table->dropColumn('supports_litters');
            });
        }
    }
};
