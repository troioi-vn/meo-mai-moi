<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('foster_return_handovers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('foster_assignment_id');
            $table->unsignedBigInteger('owner_user_id');
            $table->unsignedBigInteger('foster_user_id');
            $table->timestamp('scheduled_at')->nullable();
            $table->string('location')->nullable();
            $table->string('status')->default('pending'); // pending, confirmed, completed, canceled, disputed
            $table->timestamp('foster_initiated_at')->nullable();
            $table->timestamp('owner_confirmed_at')->nullable();
            $table->boolean('condition_confirmed')->default(false);
            $table->text('condition_notes')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->timestamps();

            $table->foreign('foster_assignment_id')->references('id')->on('foster_assignments')->cascadeOnDelete();
            $table->foreign('owner_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('foster_user_id')->references('id')->on('users')->cascadeOnDelete();

            $table->index(['foster_assignment_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('foster_return_handovers');
    }
};
