<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::dropIfExists('ownership_history');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('ownership_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamp('from_ts');
            $table->timestamp('to_ts')->nullable();
            $table->timestamps();
        });
    }
};
