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
        Schema::create('helper_profile_pet_type', function (Blueprint $table) {
            $table->foreignId('helper_profile_id')->constrained()->onDelete('cascade');
            $table->foreignId('pet_type_id')->constrained()->onDelete('cascade');
            $table->primary(['helper_profile_id', 'pet_type_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('helper_profile_pet_type');
    }
};
