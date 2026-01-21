<?php

use App\Models\Pet;
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
        // Migrate existing pet ownership data to pet_relationships

        // 1. Migrate ownership history if table exists
        if (Schema::hasTable('ownership_history')) {
            DB::statement("
                INSERT INTO pet_relationships (user_id, pet_id, relationship_type, start_at, end_at, created_by, created_at, updated_at)
                SELECT 
                    user_id,
                    pet_id,
                    'owner' as relationship_type,
                    from_ts as start_at,
                    to_ts as end_at,
                    user_id as created_by,
                    created_at,
                    updated_at
                FROM ownership_history
            ");
        } else {
            // Fallback: Migrate current owners from pets table if history doesn't exist
            DB::statement("
                INSERT INTO pet_relationships (user_id, pet_id, relationship_type, start_at, created_by, created_at, updated_at)
                SELECT 
                    created_by as user_id,
                    id as pet_id,
                    'owner' as relationship_type,
                    created_at as start_at,
                    created_by,
                    created_at,
                    updated_at
                FROM pets
                WHERE created_by IS NOT NULL
            ");
        }

        // 2. Migrate existing viewers from pet_viewers pivot table
        if (Schema::hasTable('pet_viewers')) {
            DB::statement("
                INSERT INTO pet_relationships (user_id, pet_id, relationship_type, start_at, created_by, created_at, updated_at)
                SELECT 
                    pv.user_id,
                    pv.pet_id,
                    'viewer' as relationship_type,
                    pv.created_at as start_at,
                    p.created_by,
                    pv.created_at,
                    pv.updated_at
                FROM pet_viewers pv
                JOIN pets p ON p.id = pv.pet_id
            ");
        }

        // 3. Migrate existing editors from pet_editors pivot table
        if (Schema::hasTable('pet_editors')) {
            DB::statement("
                INSERT INTO pet_relationships (user_id, pet_id, relationship_type, start_at, created_by, created_at, updated_at)
                SELECT 
                    pe.user_id,
                    pe.pet_id,
                    'editor' as relationship_type,
                    pe.created_at as start_at,
                    p.created_by,
                    pe.created_at,
                    pe.updated_at
                FROM pet_editors pe
                JOIN pets p ON p.id = pe.pet_id
            ");
        }

        // 4. Migrate existing fosters from foster_assignments table
        if (Schema::hasTable('foster_assignments')) {
            DB::statement("
                INSERT INTO pet_relationships (user_id, pet_id, relationship_type, start_at, end_at, created_by, created_at, updated_at)
                SELECT 
                    foster_user_id,
                    pet_id,
                    'foster' as relationship_type,
                    start_date as start_at,
                    CASE 
                        WHEN status = 'active' THEN NULL 
                        ELSE COALESCE(completed_at, canceled_at, updated_at) 
                    END as end_at,
                    owner_user_id as created_by,
                    created_at,
                    updated_at
                FROM foster_assignments
                WHERE pet_id IS NOT NULL
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Clear all migrated data
        DB::table('pet_relationships')->truncate();
    }
};
