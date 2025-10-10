<?php

namespace Database\Seeders;

use App\Models\PetType;
use Illuminate\Database\Seeder;

class PetTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create system pet types with explicit IDs
        // Use firstOrCreate to avoid duplicates on re-seeding

        $cat = PetType::firstOrCreate(
            ['slug' => 'cat'],
            [
                'id' => 1,
                'name' => 'Cat',
                'description' => 'Domestic cats and felines',
                'is_active' => true,
                'is_system' => true,
                'display_order' => 0,
            ]
        );
        // Ensure flags are correct even if record already existed
        $cat->update([
            'placement_requests_allowed' => true,
            'weight_tracking_allowed' => true,
            'microchips_allowed' => true,
        ]);

        $dog = PetType::firstOrCreate(
            ['slug' => 'dog'],
            [
                'id' => 2,
                'name' => 'Dog',
                'description' => 'Domestic dogs and canines',
                'is_active' => true,
                'is_system' => true,
                'display_order' => 1,
            ]
        );
        $dog->update([
            'placement_requests_allowed' => false,
            'weight_tracking_allowed' => false,
            'microchips_allowed' => false,
        ]);
    }
}
