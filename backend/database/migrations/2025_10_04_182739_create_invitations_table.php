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
        Schema::create('invitations', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('inviter_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('recipient_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('status')->default('pending');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            
            $table->index(['code', 'status']);
            $table->index('inviter_user_id');
            $table->index('recipient_user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invitations');
    }
};
