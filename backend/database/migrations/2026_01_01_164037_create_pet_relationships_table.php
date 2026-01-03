<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pet_relationships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('pet_id')->constrained()->onDelete('cascade');
            $table->enum('relationship_type', ['owner', 'foster', 'sitter', 'editor', 'viewer']);
            $table->timestampTz('start_at');
            $table->timestampTz('end_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            // Indexes for performance
            $table->index(['pet_id', 'relationship_type', 'end_at']);
            $table->index(['user_id', 'relationship_type', 'end_at']);
            $table->index(['pet_id', 'user_id', 'relationship_type']);
        });

        // Prevent duplicate active relationships for the same pet/user/type.
        // Postgres partial unique index.
        DB::statement('CREATE UNIQUE INDEX pet_relationships_unique_active_pet_user_type ON pet_relationships (pet_id, user_id, relationship_type) WHERE end_at IS NULL');

        // Ensure end_at is not before start_at (allow equal for immediate end).
        DB::statement('ALTER TABLE pet_relationships ADD CONSTRAINT pet_relationships_end_at_gte_start_at CHECK (end_at IS NULL OR end_at >= start_at)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pet_relationships');
    }
};
