<?php

namespace Database\Seeders;

use App\Enums\PlacementRequestType;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Database\Seeder;

class PlacementRequestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Note: Placement requests are now created in DatabaseSeeder after pets are created.
     * This seeder is kept for backwards compatibility.
     */
    public function run(): void
    {
        // Placement request creation has been moved to DatabaseSeeder
        // to ensure pets are created first
    }
}
