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
            // Add FK now that placement_requests table exists (created at 2025_07_24_164530)
            $table->foreign('placement_request_id')
                ->references('id')
                ->on('placement_requests')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropForeign(['placement_request_id']);
        });
    }
};
