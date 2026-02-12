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
        Schema::create('relationship_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invited_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->enum('relationship_type', ['owner', 'editor', 'viewer']);
            $table->enum('status', ['pending', 'accepted', 'declined', 'revoked', 'expired'])->default('pending');
            $table->timestampTz('expires_at');
            $table->timestampTz('accepted_at')->nullable();
            $table->timestampTz('declined_at')->nullable();
            $table->timestampTz('revoked_at')->nullable();
            $table->foreignId('accepted_by_user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            // Indexes for performance
            $table->index(['pet_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('relationship_invitations');
    }
};
