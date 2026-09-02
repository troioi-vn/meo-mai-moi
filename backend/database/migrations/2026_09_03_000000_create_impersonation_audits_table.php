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
        Schema::create('impersonation_audits', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('impersonator_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('target_user_id')->nullable()->constrained('users')->nullOnDelete();
            // The handoff token never lands here; only its hash, so the row can
            // be found again at consume time without the table becoming a way in.
            $table->string('token_hash', 64)->unique();
            $table->string('status', 20)->default('issued');
            $table->string('source', 50)->default('admin_panel');
            $table->string('guard', 50)->default('web');
            $table->string('impersonator_name', 255)->nullable();
            $table->string('impersonator_email', 255)->nullable();
            $table->string('target_name', 255)->nullable();
            $table->string('target_email', 255)->nullable();
            $table->string('back_to', 2048)->nullable();
            $table->string('issued_ip', 45)->nullable();
            $table->string('consumed_ip', 45)->nullable();
            $table->string('rejection_reason', 100)->nullable();
            $table->timestampTz('expires_at');
            $table->timestampTz('consumed_at')->nullable();
            $table->timestampTz('left_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('created_at');
            $table->index('target_user_id', 'impersonation_audits_target_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('impersonation_audits');
    }
};
