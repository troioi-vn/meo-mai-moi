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
        Schema::create('email_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('notification_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('email_configuration_id')->nullable()->constrained()->onDelete('set null');

            // Email details
            $table->string('recipient_email');
            $table->string('subject');
            $table->longText('body');
            $table->json('headers')->nullable();

            // Delivery tracking
            $table->string('status')->default('pending'); // pending, sent, delivered, failed, bounced
            $table->text('smtp_response')->nullable();
            $table->text('error_message')->nullable();

            // Timestamps
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('failed_at')->nullable();

            // Retry tracking
            $table->integer('retry_count')->default(0);
            $table->timestamp('next_retry_at')->nullable();

            $table->timestamps();

            // Indexes for performance
            $table->index(['recipient_email', 'created_at']);
            $table->index(['status', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_logs');
    }
};
