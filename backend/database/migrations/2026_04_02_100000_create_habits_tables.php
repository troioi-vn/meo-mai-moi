<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('habits', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('value_type', 32);
            $table->integer('scale_min')->nullable();
            $table->integer('scale_max')->nullable();
            $table->boolean('share_with_coowners')->default(false);
            $table->boolean('reminder_enabled')->default(false);
            $table->time('reminder_time')->nullable();
            $table->json('reminder_weekdays')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->index(['created_by', 'archived_at']);
            $table->index(['reminder_enabled', 'reminder_time', 'archived_at'], 'habits_reminder_idx');
        });

        Schema::create('habit_pet', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('habit_id')->constrained('habits')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['habit_id', 'pet_id']);
        });

        Schema::create('habit_entries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('habit_id')->constrained('habits')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->date('entry_date');
            $table->integer('value_int');
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['habit_id', 'pet_id', 'entry_date']);
            $table->index(['habit_id', 'entry_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('habit_entries');
        Schema::dropIfExists('habit_pet');
        Schema::dropIfExists('habits');
    }
};
