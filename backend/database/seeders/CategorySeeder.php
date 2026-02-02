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
                ['name' => ['en' => 'Siamese', 'vi' => 'Siamese', 'ru' => 'Сиамская', 'uk' => 'Сіамська'], 'description' => ''],
                ['name' => ['en' => 'Persian', 'vi' => 'Ba Tư', 'ru' => 'Персидская', 'uk' => 'Перська'], 'description' => ''],
                ['name' => ['en' => 'Maine Coon', 'vi' => 'Maine Coon', 'ru' => 'Мейн-кун', 'uk' => 'Мейн-кун'], 'description' => ''],
                ['name' => ['en' => 'British Shorthair', 'vi' => 'Anh lông ngắn', 'ru' => 'Британская короткошерстная', 'uk' => 'Британська короткошерста'], 'description' => ''],
                ['name' => ['en' => 'Ragdoll', 'vi' => 'Ragdoll', 'ru' => 'Рэгдолл', 'uk' => 'Регдолл'], 'description' => ''],
                ['name' => ['en' => 'Bengal', 'vi' => 'Bengal', 'ru' => 'Бенгальская', 'uk' => 'Бенгальська'], 'description' => ''],
                ['name' => ['en' => 'Sphynx', 'vi' => 'Sphynx', 'ru' => 'Сфинкс', 'uk' => 'Сфінкс'], 'description' => ''],
                ['name' => ['en' => 'Scottish Fold', 'vi' => 'Tai cụp', 'ru' => 'Шотландская вислоухая', 'uk' => 'Шотландська висловуха'], 'description' => ''],
                ['name' => ['en' => 'Abyssinian', 'vi' => 'Abyssinian', 'ru' => 'Абиссинская', 'uk' => 'Абіссінська'], 'description' => ''],
                ['name' => ['en' => 'Mixed Breed', 'vi' => 'Lai', 'ru' => 'Смешанная порода', 'uk' => 'Метис'], 'description' => ''],
                // Characteristics
                ['name' => ['en' => 'Long-haired', 'vi' => 'Lông dài', 'ru' => 'Длинношерстная', 'uk' => 'Довгошерста'], 'description' => ''],
                ['name' => ['en' => 'Short-haired', 'vi' => 'Lông ngắn', 'ru' => 'Короткошерстная', 'uk' => 'Короткошерста'], 'description' => ''],
                ['name' => ['en' => 'Indoor', 'vi' => 'Trong nhà', 'ru' => 'Домашняя', 'uk' => 'Домашня'], 'description' => ''],
                ['name' => ['en' => 'Outdoor', 'vi' => 'Ngoài trời', 'ru' => 'Уличная', 'uk' => 'Вулична'], 'description' => ''],
            ],
            'dog' => [
                // Breeds
                ['name' => ['en' => 'Labrador Retriever', 'vi' => 'Labrador', 'ru' => 'Лабрадор-ретривер', 'uk' => 'Лабрадор-ретривер'], 'description' => ''],
                ['name' => ['en' => 'Golden Retriever', 'vi' => 'Golden', 'ru' => 'Голден-ретривер', 'uk' => 'Голден-ретривер'], 'description' => ''],
                ['name' => ['en' => 'German Shepherd', 'vi' => 'Becgie Đức', 'ru' => 'Немецкая овчарка', 'uk' => 'Німецька вівчарка'], 'description' => ''],
                ['name' => ['en' => 'Beagle', 'vi' => 'Beagle', 'ru' => 'Бигль', 'uk' => 'Бігль'], 'description' => ''],
                ['name' => ['en' => 'Bulldog', 'vi' => 'Bulldog', 'ru' => 'Бульдог', 'uk' => 'Бульдог'], 'description' => ''],
                ['name' => ['en' => 'Poodle', 'vi' => 'Пудель', 'ru' => 'Пудель', 'uk' => 'Пудель'], 'description' => ''],
                ['name' => ['en' => 'Rottweiler', 'vi' => 'Rottweiler', 'ru' => 'Ротвейлер', 'uk' => 'Ротвейлер'], 'description' => ''],
                ['name' => ['en' => 'Yorkshire Terrier', 'vi' => 'Yorkshire', 'ru' => 'Йоркширский терьер', 'uk' => 'Йоркширський тер’єр'], 'description' => ''],
                ['name' => ['en' => 'Boxer', 'vi' => 'Boxer', 'ru' => 'Боксер', 'uk' => 'Боксер'], 'description' => ''],
                ['name' => ['en' => 'Dachshund', 'vi' => 'Lạp xưởng', 'ru' => 'Такса', 'uk' => 'Такса'], 'description' => ''],
                ['name' => ['en' => 'Shiba Inu', 'vi' => 'Shiba Inu', 'ru' => 'Сиба-ину', 'uk' => 'Сіба-іну'], 'description' => ''],
                ['name' => ['en' => 'Husky', 'vi' => 'Husky', 'ru' => 'Хаски', 'uk' => 'Хаскі'], 'description' => ''],
                ['name' => ['en' => 'Mixed Breed', 'vi' => 'Lai', 'ru' => 'Смешанная порода', 'uk' => 'Метис'], 'description' => ''],
                // Characteristics
                ['name' => ['en' => 'Small Breed', 'vi' => 'Giống nhỏ', 'ru' => 'Маленькая порода', 'uk' => 'Мала порода'], 'description' => ''],
                ['name' => ['en' => 'Medium Breed', 'vi' => 'Giống trung bình', 'ru' => 'Средняя порода', 'uk' => 'Середня порода'], 'description' => ''],
                ['name' => ['en' => 'Large Breed', 'vi' => 'Giống lớn', 'ru' => 'Большая порода', 'uk' => 'Велика порода'], 'description' => ''],
                ['name' => ['en' => 'Trained', 'vi' => 'Đã huấn luyện', 'ru' => 'Обученная', 'uk' => 'Дресирована'], 'description' => ''],
            ],
        ];


        foreach ($categoriesByPetType as $petTypeSlug => $categories) {
            $petType = PetType::where('slug', $petTypeSlug)->first();

            if (! $petType) {
                $this->command->warn("Pet type '{$petTypeSlug}' not found, skipping categories.");

                continue;
            }

            foreach ($categories as $categoryData) {
                $enName = $categoryData['name']['en'];
                $translations = $categoryData['name'];

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
