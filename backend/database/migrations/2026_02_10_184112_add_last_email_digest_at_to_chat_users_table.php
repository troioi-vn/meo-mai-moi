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
        Schema::table('chat_users', function (Blueprint $table) {
            $table->timestamp('last_email_digest_at')->nullable()->after('last_read_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chat_users', function (Blueprint $table) {
            $table->dropColumn('last_email_digest_at');
        });
    }
};
