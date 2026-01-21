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
            // Remove helper_profile_id - now tracked via placement_request_responses
            $table->dropForeign(['helper_profile_id']);
            $table->dropColumn('helper_profile_id');

            // Remove obsolete columns - relationship type comes from placement request
            $table->dropColumn('requested_relationship_type');
            $table->dropColumn('fostering_type');
            $table->dropColumn('price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->foreignId('helper_profile_id')->nullable()->constrained();
            $table->string('requested_relationship_type')->default('fostering');
            $table->string('fostering_type')->nullable();
            $table->decimal('price', 8, 2)->nullable();
        });
    }
};
