<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transfer_handovers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transfer_request_id')->constrained('transfer_requests')->cascadeOnDelete();
            $table->foreignId('owner_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('helper_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('scheduled_at')->nullable();
            $table->string('location')->nullable();
            $table->string('status')->default('pending'); // pending, confirmed, completed, canceled, disputed
            $table->timestamp('owner_initiated_at')->nullable();
            $table->timestamp('helper_confirmed_at')->nullable();
            $table->boolean('condition_confirmed')->default(false);
            $table->text('condition_notes')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transfer_handovers');
    }
};
