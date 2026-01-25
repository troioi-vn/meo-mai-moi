<?php

namespace Database\Seeders;

use App\Enums\PetTypeStatus;
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
                'status' => PetTypeStatus::ACTIVE,
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
                'status' => PetTypeStatus::ACTIVE,
                'is_system' => true,
                'display_order' => 1,
            ]
        );
        $dog->update([
            'placement_requests_allowed' => true,
            'weight_tracking_allowed' => true,
            'microchips_allowed' => true,
        ]);

        $bird = PetType::firstOrCreate(
            ['slug' => 'bird'],
            [
                'id' => 3,
                'name' => 'Bird',
                'description' => 'Pet birds of various species',
                'status' => PetTypeStatus::ACTIVE,
                'is_system' => true,
                'display_order' => 2,
            ]
        );
        $bird->update([
            'placement_requests_allowed' => false,
            'weight_tracking_allowed' => false,
            'microchips_allowed' => false,
        ]);

        $moreTypes = [
            ['name' => 'Fish', 'slug' => 'fish', 'description' => 'Aquatic pets'],

            ['name' => 'Rabbit', 'slug' => 'rabbit', 'description' => 'Domestic rabbits', 'weight_tracking_allowed' => true, 'microchips_allowed' => true],
            ['name' => 'Hamster', 'slug' => 'hamster', 'description' => 'Small pet rodents', 'weight_tracking_allowed' => true],
            ['name' => 'Guinea pig', 'slug' => 'guinea-pig', 'description' => 'Social pet rodents', 'weight_tracking_allowed' => true],
            ['name' => 'Mouse', 'slug' => 'mouse', 'description' => 'Small pet rodents', 'weight_tracking_allowed' => true],
            ['name' => 'Rat', 'slug' => 'rat', 'description' => 'Intelligent pet rodents', 'weight_tracking_allowed' => true],
            ['name' => 'Gerbil', 'slug' => 'gerbil', 'description' => 'Small desert rodents', 'weight_tracking_allowed' => true],
            ['name' => 'Ferret', 'slug' => 'ferret', 'description' => 'Domesticated mustelids', 'weight_tracking_allowed' => true, 'microchips_allowed' => true],
            ['name' => 'Chinchilla', 'slug' => 'chinchilla', 'description' => 'Soft-furred rodents', 'weight_tracking_allowed' => true],
            ['name' => 'Hedgehog', 'slug' => 'hedgehog', 'description' => 'Spiny mammals', 'weight_tracking_allowed' => true],
            ['name' => 'Sugar glider', 'slug' => 'sugar-glider', 'description' => 'Gliding marsupials', 'weight_tracking_allowed' => true],

            ['name' => 'Lizard', 'slug' => 'lizard', 'description' => 'Pet reptiles', 'weight_tracking_allowed' => true],
            ['name' => 'Snake', 'slug' => 'snake', 'description' => 'Pet reptiles', 'weight_tracking_allowed' => true],
            ['name' => 'Turtle', 'slug' => 'turtle', 'description' => 'Pet reptiles', 'weight_tracking_allowed' => true],
            ['name' => 'Frog', 'slug' => 'frog', 'description' => 'Pet amphibians', 'weight_tracking_allowed' => true],
            ['name' => 'Axolotl', 'slug' => 'axolotl', 'description' => 'Aquatic amphibians', 'weight_tracking_allowed' => true],

            ['name' => 'Spider', 'slug' => 'spider', 'description' => 'Pet arachnids'],
            ['name' => 'Scorpion', 'slug' => 'scorpion', 'description' => 'Pet arachnids'],
            ['name' => 'Snail', 'slug' => 'snail', 'description' => 'Pet mollusks'],
            ['name' => 'Crab', 'slug' => 'crab', 'description' => 'Pet crustaceans'],

            ['name' => 'Horse', 'slug' => 'horse', 'description' => 'Large domesticated mammals', 'weight_tracking_allowed' => true, 'microchips_allowed' => true],
            ['name' => 'Goat', 'slug' => 'goat', 'description' => 'Farm animals as pets', 'weight_tracking_allowed' => true, 'microchips_allowed' => true],
            ['name' => 'Sheep', 'slug' => 'sheep', 'description' => 'Farm animals as pets', 'weight_tracking_allowed' => true, 'microchips_allowed' => true],
            ['name' => 'Pig', 'slug' => 'pig', 'description' => 'Farm animals as pets', 'weight_tracking_allowed' => true, 'microchips_allowed' => true],
            ['name' => 'Donkey', 'slug' => 'donkey', 'description' => 'Large domesticated mammals', 'weight_tracking_allowed' => true, 'microchips_allowed' => true],
            ['name' => 'Cattle', 'slug' => 'cattle', 'description' => 'Farm animals as pets', 'weight_tracking_allowed' => true, 'microchips_allowed' => true],
            ['name' => 'Chicken', 'slug' => 'chicken', 'description' => 'Domestic poultry', 'weight_tracking_allowed' => true],
            ['name' => 'Duck', 'slug' => 'duck', 'description' => 'Domestic poultry', 'weight_tracking_allowed' => true],
        ];

        foreach ($moreTypes as $index => $data) {
            $type = PetType::firstOrCreate(
                ['slug' => $data['slug']],
                [
                    'id' => 4 + $index,
                    'name' => $data['name'],
                    'description' => $data['description'],
                    'status' => PetTypeStatus::ACTIVE,
                    'is_system' => true,
                    'display_order' => 3 + $index,
                ]
            );

            $type->update([
                'placement_requests_allowed' => false,
                'weight_tracking_allowed' => $data['weight_tracking_allowed'] ?? false,
                'microchips_allowed' => $data['microchips_allowed'] ?? false,
            ]);
        }
    }
}
