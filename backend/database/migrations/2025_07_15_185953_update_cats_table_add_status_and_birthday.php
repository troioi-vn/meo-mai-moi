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
        if (app()->environment('testing')) {
            return;
        }
        Schema::table('cats', function (Blueprint $table) {
            $table->date('birthday')->nullable()->after('age');
            $table->dropColumn('age');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (app()->environment('testing')) {
            return;
        }
        Schema::table('cats', function (Blueprint $table) {
            $table->integer('age')->nullable()->after('birthday');
            $table->dropColumn('birthday');
        });
    }
};
