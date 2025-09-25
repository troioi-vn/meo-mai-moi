<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('foster_assignments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('cat_id');
            $table->unsignedBigInteger('owner_user_id');
            $table->unsignedBigInteger('foster_user_id');
            $table->unsignedBigInteger('transfer_request_id')->nullable();
            $table->date('start_date')->nullable();
            $table->date('expected_end_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->enum('status', ['active', 'completed', 'canceled'])->default('active');
            $table->timestamps();

            $table->foreign('cat_id')->references('id')->on('cats')->cascadeOnDelete();
            $table->foreign('owner_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('foster_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('transfer_request_id')->references('id')->on('transfer_requests')->nullOnDelete();

            $table->index(['cat_id', 'status']);
            $table->index(['foster_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('foster_assignments');
    }
};
