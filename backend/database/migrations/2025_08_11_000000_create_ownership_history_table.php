<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ownership_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cat_id')->constrained('cats')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('from_ts');
            $table->timestamp('to_ts')->nullable();
            $table->timestamps();
            $table->index(['cat_id', 'from_ts']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ownership_history');
    }
};
