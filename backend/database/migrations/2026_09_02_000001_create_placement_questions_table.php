<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('placement_questions', function (Blueprint $table): void {
            $table->id();

            // Questions belong to the pet, not the listing, so an owner who
            // relists keeps the answers they already wrote. The listing the
            // question was asked from is kept for context and goes null when
            // that listing is deleted.
            $table->foreignId('pet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('placement_request_id')->nullable()->constrained()->nullOnDelete();

            $table->string('asker_name');
            $table->string('asker_email')->nullable();
            $table->timestamp('asker_email_confirmed_at')->nullable();
            $table->string('email_confirmation_token_hash', 64)->nullable();
            $table->timestamp('email_confirmation_expires_at')->nullable();
            $table->string('asker_ip', 45)->nullable();

            $table->text('question');
            $table->string('question_locale', 5)->nullable();

            $table->text('answer')->nullable();
            $table->string('answer_locale', 5)->nullable();

            // Kept as a snapshot so an ownership transfer can drop the previous
            // owner's name without orphaning the answer text.
            $table->foreignId('answered_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('answered_by_name')->nullable();
            $table->timestamp('answered_at')->nullable();

            $table->string('status')->default('pending');
            $table->timestamp('published_at')->nullable();
            $table->timestamp('hidden_at')->nullable();

            $table->timestamps();

            $table->index(['pet_id', 'status', 'published_at'], 'placement_questions_pet_status_index');
            $table->index(['placement_request_id'], 'placement_questions_request_index');
            $table->index(['status', 'created_at'], 'placement_questions_status_created_index');
            $table->index(['asker_email'], 'placement_questions_asker_email_index');
            $table->index(['email_confirmation_expires_at'], 'placement_questions_confirmation_expiry_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('placement_questions');
    }
};
