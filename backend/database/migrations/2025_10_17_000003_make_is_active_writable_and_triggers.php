<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Email configurations: drop generated, add writable boolean, backfill, add triggers
        if (Schema::hasColumn('email_configurations', 'is_active')) {
            // Drop and re-add as writable boolean
            DB::statement('ALTER TABLE email_configurations DROP COLUMN is_active');
        }
        DB::statement('ALTER TABLE email_configurations ADD COLUMN is_active boolean NOT NULL DEFAULT false');
        DB::statement("UPDATE email_configurations SET is_active = (status = 'active')");

        // Create functions (drop first if exist)
        DB::statement('DROP FUNCTION IF EXISTS email_configurations_set_is_active_from_status() CASCADE');
        DB::statement(<<<'SQL'
CREATE FUNCTION email_configurations_set_is_active_from_status()
RETURNS trigger AS $$
BEGIN
    NEW.is_active := (NEW.status = 'active');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
SQL);

        DB::statement('DROP FUNCTION IF EXISTS email_configurations_set_status_from_is_active() CASCADE');
        DB::statement(<<<'SQL'
CREATE FUNCTION email_configurations_set_status_from_is_active()
RETURNS trigger AS $$
BEGIN
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        NEW.status := CASE WHEN NEW.is_active THEN 'active' ELSE 'inactive' END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
SQL);

        // Create triggers
        DB::statement('DROP TRIGGER IF EXISTS trg_email_configurations_set_is_active ON email_configurations');
        DB::statement('CREATE TRIGGER trg_email_configurations_set_is_active BEFORE INSERT OR UPDATE OF status ON email_configurations FOR EACH ROW EXECUTE FUNCTION email_configurations_set_is_active_from_status()');

        DB::statement('DROP TRIGGER IF EXISTS trg_email_configurations_set_status ON email_configurations');
        DB::statement('CREATE TRIGGER trg_email_configurations_set_status BEFORE UPDATE OF is_active ON email_configurations FOR EACH ROW EXECUTE FUNCTION email_configurations_set_status_from_is_active()');

        // Placement requests: same pattern (active when status = 'open')
        if (Schema::hasColumn('placement_requests', 'is_active')) {
            DB::statement('ALTER TABLE placement_requests DROP COLUMN is_active');
        }
        DB::statement('ALTER TABLE placement_requests ADD COLUMN is_active boolean NOT NULL DEFAULT false');
        DB::statement("UPDATE placement_requests SET is_active = (status = 'open')");

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

        DB::statement('DROP TRIGGER IF EXISTS trg_placement_requests_set_is_active ON placement_requests');
        DB::statement('CREATE TRIGGER trg_placement_requests_set_is_active BEFORE INSERT OR UPDATE OF status ON placement_requests FOR EACH ROW EXECUTE FUNCTION placement_requests_set_is_active_from_status()');

        DB::statement('DROP TRIGGER IF EXISTS trg_placement_requests_set_status ON placement_requests');
        DB::statement('CREATE TRIGGER trg_placement_requests_set_status BEFORE UPDATE OF is_active ON placement_requests FOR EACH ROW EXECUTE FUNCTION placement_requests_set_status_from_is_active()');
    }

    public function down(): void
    {
        // Remove triggers and functions and columns (rely on previous migrations for schema)
        DB::statement('DROP TRIGGER IF EXISTS trg_email_configurations_set_is_active ON email_configurations');
        DB::statement('DROP TRIGGER IF EXISTS trg_email_configurations_set_status ON email_configurations');
        DB::statement('DROP FUNCTION IF EXISTS email_configurations_set_is_active_from_status() CASCADE');
        DB::statement('DROP FUNCTION IF EXISTS email_configurations_set_status_from_is_active() CASCADE');

        DB::statement('DROP TRIGGER IF EXISTS trg_placement_requests_set_is_active ON placement_requests');
        DB::statement('DROP TRIGGER IF EXISTS trg_placement_requests_set_status ON placement_requests');
        DB::statement('DROP FUNCTION IF EXISTS placement_requests_set_is_active_from_status() CASCADE');
        DB::statement('DROP FUNCTION IF EXISTS placement_requests_set_status_from_is_active() CASCADE');

        if (Schema::hasColumn('email_configurations', 'is_active')) {
            DB::statement('ALTER TABLE email_configurations DROP COLUMN is_active');
        }
        if (Schema::hasColumn('placement_requests', 'is_active')) {
            DB::statement('ALTER TABLE placement_requests DROP COLUMN is_active');
        }
    }
};
