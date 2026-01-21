<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('notifications', 'is_read')) {
            return;
        }

        Schema::table('notifications', function (Blueprint $table): void {
            $table->boolean('is_read')->default(false);
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('notifications', 'is_read')) {
            return;
        }

        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropColumn('is_read');
        });
    }
};
