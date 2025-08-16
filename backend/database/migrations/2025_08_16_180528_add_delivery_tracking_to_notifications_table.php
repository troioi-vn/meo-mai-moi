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
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('type')->nullable()->after('user_id');
            $table->json('data')->nullable()->after('link');
            $table->timestamp('read_at')->nullable()->after('is_read');
            $table->timestamp('delivered_at')->nullable()->after('read_at');
            $table->timestamp('failed_at')->nullable()->after('delivered_at');
            $table->text('failure_reason')->nullable()->after('failed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn([
                'type',
                'data',
                'read_at',
                'delivered_at',
                'failed_at',
                'failure_reason'
            ]);
        });
    }
};
