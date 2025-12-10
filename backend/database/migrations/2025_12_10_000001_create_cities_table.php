<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cities', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 120);
            $table->string('country', 2);
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->unique(['name', 'country']);
            $table->unique(['slug', 'country']);
            $table->index(['country', 'name']);
        });

        Schema::table('pets', function (Blueprint $table) {
            $table->foreignId('city_id')->nullable()->after('state')->constrained('cities')->restrictOnDelete();
            $table->index('city_id');
        });

        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->foreignId('city_id')->nullable()->after('country')->constrained('cities')->restrictOnDelete();
            $table->index('city_id');
        });
    }

    public function down(): void
    {
        Schema::table('helper_profiles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('city_id');
        });

        Schema::table('pets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('city_id');
        });

        Schema::dropIfExists('cities');
    }
};
