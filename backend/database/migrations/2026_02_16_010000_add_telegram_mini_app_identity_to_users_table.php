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
            $table->unsignedBigInteger('telegram_user_id')->nullable()->after('telegram_chat_id');
            $table->string('telegram_username')->nullable()->after('telegram_user_id');
            $table->string('telegram_first_name')->nullable()->after('telegram_username');
            $table->string('telegram_last_name')->nullable()->after('telegram_first_name');
            $table->text('telegram_photo_url')->nullable()->after('telegram_last_name');
            $table->timestamp('telegram_last_authenticated_at')->nullable()->after('telegram_link_token_expires_at');

            $table->unique('telegram_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['telegram_user_id']);
            $table->dropColumn([
                'telegram_user_id',
                'telegram_username',
                'telegram_first_name',
                'telegram_last_name',
                'telegram_photo_url',
                'telegram_last_authenticated_at',
            ]);
        });
    }
};
