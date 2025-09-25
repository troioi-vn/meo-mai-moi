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
        Schema::create('pets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_type_id')->constrained('pet_types')->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('breed');
            $table->date('birthday');
            $table->string('location');
            $table->text('description')->nullable();
            $table->enum('status', ['active', 'lost', 'deceased', 'deleted'])->default('active');
            $table->timestamps();

            // Indexes for efficient querying
            $table->index(['pet_type_id', 'status']);
            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pets');
    }
};
