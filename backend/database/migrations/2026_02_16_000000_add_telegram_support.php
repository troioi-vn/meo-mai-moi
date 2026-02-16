<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('telegram_chat_id')->nullable()->after('locale');
            $table->string('telegram_link_token', 64)->nullable()->after('telegram_chat_id');
            $table->timestamp('telegram_link_token_expires_at')->nullable()->after('telegram_link_token');

            $table->index('telegram_chat_id');
            $table->index('telegram_link_token');
        });

        Schema::table('notification_preferences', function (Blueprint $table) {
            $table->boolean('telegram_enabled')->default(false)->after('in_app_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['telegram_chat_id']);
            $table->dropIndex(['telegram_link_token']);
            $table->dropColumn(['telegram_chat_id', 'telegram_link_token', 'telegram_link_token_expires_at']);
        });

        Schema::table('notification_preferences', function (Blueprint $table) {
            $table->dropColumn('telegram_enabled');
        });
    }
};
