<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE pets DROP CONSTRAINT pets_status_check');
        DB::statement("ALTER TABLE pets ADD CONSTRAINT pets_status_check CHECK (status::text = ANY (ARRAY['active'::text, 'lost'::text, 'deceased'::text, 'archived'::text, 'deleted'::text]))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE pets DROP CONSTRAINT pets_status_check');
        DB::statement("ALTER TABLE pets ADD CONSTRAINT pets_status_check CHECK (status::text = ANY (ARRAY['active'::text, 'lost'::text, 'deceased'::text, 'deleted'::text]))");
    }
};
