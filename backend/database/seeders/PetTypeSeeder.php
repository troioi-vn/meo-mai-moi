<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
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
        
        \App\Models\PetType::firstOrCreate(
            ['slug' => 'cat'],
            [
                'id' => 1,
                'name' => 'Cat',
                'description' => 'Domestic cats and felines',
                'is_active' => true,
                'is_system' => true,
                'display_order' => 0,
                'placement_requests_allowed' => true,
            ]
        );

        \App\Models\PetType::firstOrCreate(
            ['slug' => 'dog'],
            [
                'id' => 2,
                'name' => 'Dog',
                'description' => 'Domestic dogs and canines',
                'is_active' => true,
                'is_system' => true,
                'display_order' => 1,
                'placement_requests_allowed' => false,
            ]
        );
    }
}
