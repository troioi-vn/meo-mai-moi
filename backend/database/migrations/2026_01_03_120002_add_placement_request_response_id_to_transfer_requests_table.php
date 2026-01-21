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
            if (! Schema::hasColumn('transfer_requests', 'placement_request_response_id')) {
                $table->foreignId('placement_request_response_id')->nullable()->constrained('placement_request_responses')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropForeign(['placement_request_response_id']);
            $table->dropColumn('placement_request_response_id');
        });
    }
};
