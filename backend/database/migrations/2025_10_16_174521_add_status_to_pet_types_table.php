<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pet_types', function (Blueprint $table) {
            $table->string('status')->default('active')->after('description');
        });

        // Backfill existing data
        DB::table('pet_types')->where('is_active', true)->update(['status' => 'active']);
        DB::table('pet_types')->where('is_active', false)->update(['status' => 'inactive']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pet_types', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
