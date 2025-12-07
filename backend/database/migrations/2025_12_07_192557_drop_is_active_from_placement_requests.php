<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop triggers that depend on is_active column first
        DB::statement('DROP TRIGGER IF EXISTS trg_placement_requests_set_status ON placement_requests');
        DB::statement('DROP TRIGGER IF EXISTS trg_placement_requests_set_is_active ON placement_requests');

        // Drop the associated functions
        DB::statement('DROP FUNCTION IF EXISTS placement_requests_set_status_from_is_active() CASCADE');
        DB::statement('DROP FUNCTION IF EXISTS placement_requests_set_is_active_from_status() CASCADE');

        // Now drop the column
        if (Schema::hasColumn('placement_requests', 'is_active')) {
            DB::statement('ALTER TABLE placement_requests DROP COLUMN is_active');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate the column
        if (! Schema::hasColumn('placement_requests', 'is_active')) {
            DB::statement('ALTER TABLE placement_requests ADD COLUMN is_active boolean NOT NULL DEFAULT false');
            DB::statement("UPDATE placement_requests SET is_active = (status = 'open')");
        }

        // Recreate the functions
        DB::statement('DROP FUNCTION IF EXISTS placement_requests_set_is_active_from_status() CASCADE');
        DB::statement(<<<'SQL'
CREATE FUNCTION placement_requests_set_is_active_from_status()
RETURNS trigger AS $$
BEGIN
    NEW.is_active := (NEW.status = 'open');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
SQL);

        DB::statement('DROP FUNCTION IF EXISTS placement_requests_set_status_from_is_active() CASCADE');
        DB::statement(<<<'SQL'
CREATE FUNCTION placement_requests_set_status_from_is_active()
RETURNS trigger AS $$
BEGIN
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        NEW.status := CASE WHEN NEW.is_active THEN 'open' ELSE 'cancelled' END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
SQL);

        // Recreate the triggers
        DB::statement('DROP TRIGGER IF EXISTS trg_placement_requests_set_is_active ON placement_requests');
        DB::statement('CREATE TRIGGER trg_placement_requests_set_is_active BEFORE INSERT OR UPDATE OF status ON placement_requests FOR EACH ROW EXECUTE FUNCTION placement_requests_set_is_active_from_status()');

        DB::statement('DROP TRIGGER IF EXISTS trg_placement_requests_set_status ON placement_requests');
        DB::statement('CREATE TRIGGER trg_placement_requests_set_status BEFORE UPDATE OF is_active ON placement_requests FOR EACH ROW EXECUTE FUNCTION placement_requests_set_status_from_is_active()');
    }
};
