<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE medical_records DROP CONSTRAINT IF EXISTS medical_records_record_type_check');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE medical_records ADD CONSTRAINT medical_records_record_type_check CHECK (record_type IN ('vaccination', 'vet_visit', 'medication', 'treatment', 'other'))");
    }
};
