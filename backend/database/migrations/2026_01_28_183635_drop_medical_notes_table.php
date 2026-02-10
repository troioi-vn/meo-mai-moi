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
        Schema::dropIfExists('medical_notes');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('medical_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->cascadeOnDelete();
            $table->date('record_date');
            $table->text('note');
            $table->timestamps();

            $table->unique(['pet_id', 'record_date']);
        });
    }
};
