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
        Schema::table('pet_relationships', function (Blueprint $table) {
            if (Schema::hasColumn('pet_relationships', 'start_date')) {
                $table->renameColumn('start_date', 'start_at');
            }
            if (Schema::hasColumn('pet_relationships', 'end_date')) {
                $table->renameColumn('end_date', 'end_at');
            }
        });

        Schema::table('pet_relationships', function (Blueprint $table) {
            $table->timestampTz('start_at')->change();
            $table->timestampTz('end_at')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pet_relationships', function (Blueprint $table) {
            $table->renameColumn('start_at', 'start_date');
            $table->renameColumn('end_at', 'end_date');
        });

        Schema::table('pet_relationships', function (Blueprint $table) {
            $table->date('start_date')->change();
            $table->date('end_date')->nullable()->change();
        });
    }
};
