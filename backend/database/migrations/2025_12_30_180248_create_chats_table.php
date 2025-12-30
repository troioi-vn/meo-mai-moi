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
        Schema::create('chats', function (Blueprint $table) {
            $table->id();
            $table->string('type')->default('direct'); // direct, private_group, public_group
            $table->string('contextable_type')->nullable(); // e.g., 'PlacementRequest', 'Pet'
            $table->unsignedBigInteger('contextable_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['contextable_type', 'contextable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chats');
    }
};
