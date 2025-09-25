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
        Schema::table('reviews', function (Blueprint $table) {
            $table->enum('status', ['active', 'hidden', 'flagged', 'deleted'])->default('active');
            $table->text('moderation_notes')->nullable();
            $table->boolean('is_flagged')->default(false);
            $table->timestamp('flagged_at')->nullable();
            $table->foreignId('moderated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('moderated_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn([
                'status',
                'moderation_notes',
                'is_flagged',
                'flagged_at',
                'moderated_by',
                'moderated_at',
            ]);
        });
    }
};
