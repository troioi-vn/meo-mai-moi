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
            $table->enum('fostering_type', ['free', 'paid'])->nullable()->after('requested_relationship_type');
            $table->decimal('price', 8, 2)->nullable()->after('fostering_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropColumn(['fostering_type', 'price']);
        });
    }
};
