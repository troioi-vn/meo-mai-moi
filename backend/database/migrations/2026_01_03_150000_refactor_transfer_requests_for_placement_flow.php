<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Refactor transfer_requests table:
     * - Remove pet_id (pets are stored in placement_requests)
     * - Remove requester_id (redundant)
     * - Rename initiator_user_id → from_user_id
     * - Rename recipient_user_id → to_user_id
     * - Update status enum: accepted → confirmed
     */
    public function up(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            // Remove pet_id if it exists
            if (Schema::hasColumn('transfer_requests', 'pet_id')) {
                $table->dropForeign(['pet_id']);
                $table->dropColumn('pet_id');
            }

            // Remove requester_id if it exists
            if (Schema::hasColumn('transfer_requests', 'requester_id')) {
                $table->dropForeign(['requester_id']);
                $table->dropColumn('requester_id');
            }

            // Rename initiator_user_id to from_user_id
            if (Schema::hasColumn('transfer_requests', 'initiator_user_id')) {
                $table->renameColumn('initiator_user_id', 'from_user_id');
            }

            // Rename recipient_user_id to to_user_id
            if (Schema::hasColumn('transfer_requests', 'recipient_user_id')) {
                $table->renameColumn('recipient_user_id', 'to_user_id');
            }

            // Rename accepted_at to confirmed_at
            if (Schema::hasColumn('transfer_requests', 'accepted_at')) {
                $table->renameColumn('accepted_at', 'confirmed_at');
            }
        });

        // Update status values: accepted → confirmed
        DB::table('transfer_requests')
            ->where('status', 'accepted')
            ->update(['status' => 'confirmed']);

        // Drop and recreate the status check constraint to include 'confirmed' instead of 'accepted'
        DB::statement('ALTER TABLE transfer_requests DROP CONSTRAINT transfer_requests_status_check');
        DB::statement("ALTER TABLE transfer_requests ADD CONSTRAINT transfer_requests_status_check CHECK (status::text = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text, 'expired'::text, 'canceled'::text]))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop and recreate the status check constraint to include 'accepted' instead of 'confirmed'
        DB::statement('ALTER TABLE transfer_requests DROP CONSTRAINT transfer_requests_status_check');
        DB::statement("ALTER TABLE transfer_requests ADD CONSTRAINT transfer_requests_status_check CHECK (status::text = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'canceled'::text]))");

        // Update status values back: confirmed → accepted
        DB::table('transfer_requests')
            ->where('status', 'confirmed')
            ->update(['status' => 'accepted']);

        Schema::table('transfer_requests', function (Blueprint $table) {
            // Rename back
            if (Schema::hasColumn('transfer_requests', 'from_user_id')) {
                $table->renameColumn('from_user_id', 'initiator_user_id');
            }

            if (Schema::hasColumn('transfer_requests', 'to_user_id')) {
                $table->renameColumn('to_user_id', 'recipient_user_id');
            }

            if (Schema::hasColumn('transfer_requests', 'confirmed_at')) {
                $table->renameColumn('confirmed_at', 'accepted_at');
            }

            // Re-add removed columns
            $table->foreignId('pet_id')->nullable()->constrained('pets')->onDelete('cascade');
            $table->foreignId('requester_id')->nullable()->constrained('users')->onDelete('cascade');
        });
    }
};
