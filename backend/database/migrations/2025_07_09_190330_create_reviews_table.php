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
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reviewer_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('reviewed_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('transfer_id')->nullable()->constrained('transfer_requests')->onDelete('set null');
            $table->integer('rating'); // e.g., 1-5 stars
            $table->text('comment')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
