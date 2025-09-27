<?php

namespace Database\Seeders;

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

<<<<<<< HEAD
        \App\Models\PetType::firstOrCreate(
=======
        $cat = \App\Models\PetType::firstOrCreate(
>>>>>>> dev
            ['slug' => 'cat'],
            [
                'id' => 1,
                'name' => 'Cat',
                'description' => 'Domestic cats and felines',
                'is_active' => true,
                'is_system' => true,
                'display_order' => 0,
                'placement_requests_allowed' => true,
<<<<<<< HEAD
            ]
        );

        \App\Models\PetType::firstOrCreate(
=======
                'weight_tracking_allowed' => true,
                'microchips_allowed' => true,
            ]
        );
        // Ensure flags are correct even if record already existed
        $cat->update([
            'placement_requests_allowed' => true,
            'weight_tracking_allowed' => true,
            'microchips_allowed' => true,
        ]);

        $dog = \App\Models\PetType::firstOrCreate(
>>>>>>> dev
            ['slug' => 'dog'],
            [
                'id' => 2,
                'name' => 'Dog',
                'description' => 'Domestic dogs and canines',
                'is_active' => true,
                'is_system' => true,
                'display_order' => 1,
                'placement_requests_allowed' => false,
<<<<<<< HEAD
            ]
        );
=======
                'weight_tracking_allowed' => false,
                'microchips_allowed' => false,
            ]
        );
        $dog->update([
            'placement_requests_allowed' => false,
            'weight_tracking_allowed' => false,
            'microchips_allowed' => false,
        ]);
>>>>>>> dev
    }
}
