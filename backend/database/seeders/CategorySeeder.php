<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\PetType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Define categories for each pet type
        $categoriesByPetType = [
            'cat' => [
                // Breeds
                ['name' => 'Siamese', 'description' => ''],
                ['name' => 'Persian', 'description' => ''],
                ['name' => 'Maine Coon', 'description' => ''],
                ['name' => 'British Shorthair', 'description' => ''],
                ['name' => 'Ragdoll', 'description' => ''],
                ['name' => 'Bengal', 'description' => ''],
                ['name' => 'Sphynx', 'description' => ''],
                ['name' => 'Scottish Fold', 'description' => ''],
                ['name' => 'Abyssinian', 'description' => ''],
                ['name' => 'Mixed Breed', 'description' => ''],
                // Characteristics
                ['name' => 'Long-haired', 'description' => ''],
                ['name' => 'Short-haired', 'description' => ''],
                ['name' => 'Indoor', 'description' => ''],
                ['name' => 'Outdoor', 'description' => ''],
                ['name' => 'Senior', 'description' => ''],
                ['name' => 'Kitten', 'description' => ''],
            ],
            'dog' => [
                // Breeds
                ['name' => 'Labrador Retriever', 'description' => ''],
                ['name' => 'Golden Retriever', 'description' => ''],
                ['name' => 'German Shepherd', 'description' => ''],
                ['name' => 'Beagle', 'description' => ''],
                ['name' => 'Bulldog', 'description' => ''],
                ['name' => 'Poodle', 'description' => ''],
                ['name' => 'Rottweiler', 'description' => ''],
                ['name' => 'Yorkshire Terrier', 'description' => ''],
                ['name' => 'Boxer', 'description' => ''],
                ['name' => 'Dachshund', 'description' => ''],
                ['name' => 'Shiba Inu', 'description' => ''],
                ['name' => 'Husky', 'description' => ''],
                ['name' => 'Mixed Breed', 'description' => ''],
                // Characteristics
                ['name' => 'Small Breed', 'description' => ''],
                ['name' => 'Medium Breed', 'description' => ''],
                ['name' => 'Large Breed', 'description' => ''],
                ['name' => 'Puppy', 'description' => ''],
                ['name' => 'Senior', 'description' => ''],
                ['name' => 'Trained', 'description' => ''],
            ],
        ];

        foreach ($categoriesByPetType as $petTypeSlug => $categories) {
            $petType = PetType::where('slug', $petTypeSlug)->first();

            if (! $petType) {
                $this->command->warn("Pet type '{$petTypeSlug}' not found, skipping categories.");

                continue;
            }

            foreach ($categories as $categoryData) {
                Category::firstOrCreate(
                    [
                        'slug' => Str::slug($categoryData['name']),
                        'pet_type_id' => $petType->id,
                    ],
                    [
                        'name' => $categoryData['name'],
                        'description' => $categoryData['description'],
                        'approved_at' => now(),
                    ]
                );
            }

            $this->command->info('Seeded '.count($categories)." categories for {$petType->name}.");
        }
    }
}
