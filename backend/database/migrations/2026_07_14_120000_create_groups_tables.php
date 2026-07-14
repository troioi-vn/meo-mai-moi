<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('groups', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('created_by_user_id');
        });

        Schema::create('group_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('groups')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role');
            $table->foreignId('invited_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('start_at');
            $table->timestampTz('end_at')->nullable();
            $table->timestamps();

            $table->index(['group_id', 'role', 'end_at']);
            $table->index(['user_id', 'end_at']);
            $table->index(['group_id', 'user_id', 'end_at']);
        });

        Schema::create('group_pets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('groups')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->foreignId('added_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestampTz('start_at');
            $table->timestampTz('end_at')->nullable();
            $table->timestamps();

            $table->index(['group_id', 'end_at']);
            $table->index(['pet_id', 'end_at']);
            $table->index(['group_id', 'pet_id', 'end_at']);
        });

        Schema::create('group_resource_invitations', function (Blueprint $table) {
            $table->foreignId('resource_invitation_id')
                ->primary()
                ->constrained('resource_invitations')
                ->cascadeOnDelete();
            $table->foreignId('group_id')->constrained('groups')->cascadeOnDelete();
            $table->string('role');
            $table->timestamps();

            $table->index(['group_id', 'role']);
        });

        DB::statement('CREATE UNIQUE INDEX group_memberships_unique_active ON group_memberships (group_id, user_id) WHERE end_at IS NULL');
        DB::statement('CREATE UNIQUE INDEX group_pets_unique_active ON group_pets (group_id, pet_id) WHERE end_at IS NULL');
        DB::statement('ALTER TABLE group_memberships ADD CONSTRAINT group_memberships_end_at_gte_start_at CHECK (end_at IS NULL OR end_at >= start_at)');
        DB::statement('ALTER TABLE group_pets ADD CONSTRAINT group_pets_end_at_gte_start_at CHECK (end_at IS NULL OR end_at >= start_at)');
    }

    public function down(): void
    {
        Schema::dropIfExists('group_resource_invitations');
        Schema::dropIfExists('group_pets');
        Schema::dropIfExists('group_memberships');
        Schema::dropIfExists('groups');
    }
};
