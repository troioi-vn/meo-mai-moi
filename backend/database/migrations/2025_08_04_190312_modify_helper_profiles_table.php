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
            $table->dropColumn(['approval_status', 'zip_code']);
            $table->string('status')->default('active');
            $table->boolean('is_public')->default(true);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->string('approval_status')->default('pending');
            $table->string('zip_code');
            $table->dropColumn(['status', 'is_public']);
        });
    }
};
