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
        Schema::create('placement_request_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('placement_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('helper_profile_id')->constrained()->cascadeOnDelete();

            // Status tracking
            $table->string('status')->default('responded');

            // Timestamps for each state transition
            $table->timestamp('responded_at')->useCurrent();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            // Optional: message from helper when responding
            $table->text('message')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Index for common queries
            $table->index(['placement_request_id', 'status']);
            $table->index(['helper_profile_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('placement_request_responses');
    }
};
