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
        Schema::table('helper_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('helper_profiles', 'is_public')) {
                $table->boolean('is_public')->default(false);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('helper_profiles', 'is_public')) {
                $table->dropColumn('is_public');
            }
        });
    }
};
