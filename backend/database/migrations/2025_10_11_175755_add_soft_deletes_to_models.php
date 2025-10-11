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
        // Add deleted_at column to pets table
        Schema::table('pets', function (Blueprint $table) {
            $table->softDeletes();
        });

        // Add deleted_at column to foster_assignments table
        Schema::table('foster_assignments', function (Blueprint $table) {
            $table->softDeletes();
        });

        // Add deleted_at column to transfer_requests table
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->softDeletes();
        });

        // Add deleted_at column to reviews table
        Schema::table('reviews', function (Blueprint $table) {
            $table->softDeletes();
        });

        // Add deleted_at column to helper_profiles table
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->softDeletes();
        });

        // Add deleted_at column to placement_requests table
        Schema::table('placement_requests', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove deleted_at column from pets table
        Schema::table('pets', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        // Remove deleted_at column from foster_assignments table
        Schema::table('foster_assignments', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        // Remove deleted_at column from transfer_requests table
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        // Remove deleted_at column from reviews table
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        // Remove deleted_at column from helper_profiles table
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        // Remove deleted_at column from placement_requests table
        Schema::table('placement_requests', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
