<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            // Change the enum to include 'suspended'
            $table->enum('approval_status', ['pending', 'approved', 'rejected', 'suspended'])->default('pending')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            // Revert back to original enum values
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('pending')->change();
        });
    }
};
