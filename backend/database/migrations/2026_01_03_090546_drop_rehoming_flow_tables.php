<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Drop tables related to the old rehoming flow.
 * These models have been removed and will be reimplemented:
 * - OwnershipTransfer
 * - FosterAssignment
 * - FosterReturnHandover
 * - TransferHandover
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop in correct order to handle foreign key constraints
        Schema::dropIfExists('foster_return_handovers');
        Schema::dropIfExists('transfer_handovers');
        Schema::dropIfExists('foster_assignments');
        Schema::dropIfExists('ownership_transfers');
    }

    /**
     * Reverse the migrations.
     *
     * Note: This migration is destructive. Tables cannot be restored.
     * The rehoming flow will be reimplemented with new tables.
     */
    public function down(): void
    {
        // Tables cannot be recreated - the rehoming flow will be reimplemented
        // with potentially different table structures
    }
};
