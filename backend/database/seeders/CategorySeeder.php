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
                ['name' => ['en' => 'Siamese', 'vi' => 'Siamese', 'ru' => 'Сиамская'], 'description' => ''],
                ['name' => ['en' => 'Persian', 'vi' => 'Ba Tư', 'ru' => 'Персидская'], 'description' => ''],
                ['name' => ['en' => 'Maine Coon', 'vi' => 'Maine Coon', 'ru' => 'Мейн-кун'], 'description' => ''],
                ['name' => ['en' => 'British Shorthair', 'vi' => 'Anh lông ngắn', 'ru' => 'Британская короткошерстная'], 'description' => ''],
                ['name' => ['en' => 'Ragdoll', 'vi' => 'Ragdoll', 'ru' => 'Рэгдолл'], 'description' => ''],
                ['name' => ['en' => 'Bengal', 'vi' => 'Bengal', 'ru' => 'Бенгальская'], 'description' => ''],
                ['name' => ['en' => 'Sphynx', 'vi' => 'Sphynx', 'ru' => 'Сфинкс'], 'description' => ''],
                ['name' => ['en' => 'Scottish Fold', 'vi' => 'Tai cụp', 'ru' => 'Шотландская вислоухая'], 'description' => ''],
                ['name' => ['en' => 'Abyssinian', 'vi' => 'Abyssinian', 'ru' => 'Абиссинская'], 'description' => ''],
                ['name' => ['en' => 'Mixed Breed', 'vi' => 'Lai', 'ru' => 'Смешанная порода'], 'description' => ''],
                // Characteristics
                ['name' => ['en' => 'Long-haired', 'vi' => 'Lông dài', 'ru' => 'Длинношерстная'], 'description' => ''],
                ['name' => ['en' => 'Short-haired', 'vi' => 'Lông ngắn', 'ru' => 'Короткошерстная'], 'description' => ''],
                ['name' => ['en' => 'Indoor', 'vi' => 'Trong nhà', 'ru' => 'Домашняя'], 'description' => ''],
                ['name' => ['en' => 'Outdoor', 'vi' => 'Ngoài trời', 'ru' => 'Уличная'], 'description' => ''],
            ],
            'dog' => [
                // Breeds
                ['name' => ['en' => 'Labrador Retriever', 'vi' => 'Labrador', 'ru' => 'Лабрадор-ретривер'], 'description' => ''],
                ['name' => ['en' => 'Golden Retriever', 'vi' => 'Golden', 'ru' => 'Голден-ретривер'], 'description' => ''],
                ['name' => ['en' => 'German Shepherd', 'vi' => 'Becgie Đức', 'ru' => 'Немецкая овчарка'], 'description' => ''],
                ['name' => ['en' => 'Beagle', 'vi' => 'Beagle', 'ru' => 'Бигль'], 'description' => ''],
                ['name' => ['en' => 'Bulldog', 'vi' => 'Bulldog', 'ru' => 'Бульдог'], 'description' => ''],
                ['name' => ['en' => 'Poodle', 'vi' => 'Пудель', 'ru' => 'Пудель'], 'description' => ''],
                ['name' => ['en' => 'Rottweiler', 'vi' => 'Rottweiler', 'ru' => 'Ротвейлер'], 'description' => ''],
                ['name' => ['en' => 'Yorkshire Terrier', 'vi' => 'Yorkshire', 'ru' => 'Йоркширский терьер'], 'description' => ''],
                ['name' => ['en' => 'Boxer', 'vi' => 'Boxer', 'ru' => 'Боксер'], 'description' => ''],
                ['name' => ['en' => 'Dachshund', 'vi' => 'Lạp xưởng', 'ru' => 'Такса'], 'description' => ''],
                ['name' => ['en' => 'Shiba Inu', 'vi' => 'Shiba Inu', 'ru' => 'Сиба-ину'], 'description' => ''],
                ['name' => ['en' => 'Husky', 'vi' => 'Husky', 'ru' => 'Хаски'], 'description' => ''],
                ['name' => ['en' => 'Mixed Breed', 'vi' => 'Lai', 'ru' => 'Смешанная порода'], 'description' => ''],
                // Characteristics
                ['name' => ['en' => 'Small Breed', 'vi' => 'Giống nhỏ', 'ru' => 'Маленькая порода'], 'description' => ''],
                ['name' => ['en' => 'Medium Breed', 'vi' => 'Giống trung bình', 'ru' => 'Средняя порода'], 'description' => ''],
                ['name' => ['en' => 'Large Breed', 'vi' => 'Giống lớn', 'ru' => 'Большая порода'], 'description' => ''],
                ['name' => ['en' => 'Trained', 'vi' => 'Đã huấn luyện', 'ru' => 'Обученная'], 'description' => ''],
            ],
        ];

        foreach ($categoriesByPetType as $petTypeSlug => $categories) {
            $petType = PetType::where('slug', $petTypeSlug)->first();

            if (! $petType) {
                $this->command->warn("Pet type '{$petTypeSlug}' not found, skipping categories.");

                continue;
            }

            foreach ($categories as $categoryData) {
                $enName = is_array($categoryData['name']) ? $categoryData['name']['en'] : $categoryData['name'];
                $translations = is_array($categoryData['name']) ? $categoryData['name'] : ['en' => $categoryData['name']];

                Category::updateOrCreate(
                    [
                        'slug' => Str::slug($enName),
                        'pet_type_id' => $petType->id,
                    ],
                    [
                        'name' => $translations,
                        'description' => $categoryData['description'],
                        'approved_at' => now(),
                    ]
                );
            }

            $this->command->info('Seeded '.count($categories)." categories for {$petType->name}.");
        }
    }
}
