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
        Schema::table('transfer_requests', function (Blueprint $table) {
            // Add new pet_id column
            $table->foreignId('pet_id')->nullable()->after('id')->constrained('pets')->onDelete('cascade');
            
            // Make cat_id nullable for transition period
            $table->unsignedBigInteger('cat_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropForeign(['pet_id']);
            $table->dropColumn('pet_id');
            
            // Restore cat_id as required
            $table->unsignedBigInteger('cat_id')->nullable(false)->change();
        });
    }
};
