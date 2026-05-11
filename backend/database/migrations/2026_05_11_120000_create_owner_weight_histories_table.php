<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('owner_weight_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('weight_kg', 8, 2);
            $table->date('record_date');
            $table->timestamps();

            $table->unique(['user_id', 'record_date']);
            $table->index(['user_id', 'record_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('owner_weight_histories');
    }
};