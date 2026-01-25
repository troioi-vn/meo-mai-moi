<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'is_banned')) {
                $table->boolean('is_banned')->default(false)->after('remember_token');
            }

            if (! Schema::hasColumn('users', 'banned_at')) {
                $table->timestamp('banned_at')->nullable()->after('is_banned');
            }

            if (! Schema::hasColumn('users', 'ban_reason')) {
                $table->string('ban_reason', 255)->nullable()->after('banned_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $columns = [];

            if (Schema::hasColumn('users', 'ban_reason')) {
                $columns[] = 'ban_reason';
            }

            if (Schema::hasColumn('users', 'banned_at')) {
                $columns[] = 'banned_at';
            }

            if (Schema::hasColumn('users', 'is_banned')) {
                $columns[] = 'is_banned';
            }

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
