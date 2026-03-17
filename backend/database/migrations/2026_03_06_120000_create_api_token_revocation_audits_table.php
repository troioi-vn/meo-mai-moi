<?php

declare(strict_types=1);

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
        Schema::create('api_token_revocation_audits', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('target_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('token_id')->nullable();
            $table->string('token_name', 255);
            $table->string('tokenable_type', 255)->nullable();
            $table->unsignedBigInteger('tokenable_id')->nullable();
            $table->json('token_abilities')->nullable();
            $table->timestampTz('token_last_used_at')->nullable();
            $table->string('source', 50)->default('admin_panel');
            $table->string('actor_name', 255)->nullable();
            $table->string('actor_email', 255)->nullable();
            $table->string('target_name', 255)->nullable();
            $table->string('target_email', 255)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('token_id');
            $table->index('source');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('api_token_revocation_audits');
    }
};
