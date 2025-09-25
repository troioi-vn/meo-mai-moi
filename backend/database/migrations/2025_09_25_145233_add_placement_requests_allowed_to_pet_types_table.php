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
        Schema::table('pet_types', function (Blueprint $table) {
            $table->boolean('placement_requests_allowed')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pet_types', function (Blueprint $table) {
            $table->dropColumn('placement_requests_allowed');
        });
    }
};
