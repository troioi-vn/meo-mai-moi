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
        // Use updateOrCreate to ensure translations are applied to existing records

        $cat = PetType::updateOrCreate(
            ['slug' => 'cat'],
            [
                'id' => 1,
                'name' => [
                    'en' => 'Cat',
                    'vi' => 'Mèo',
                    'ru' => 'Кошка',
                    'uk' => 'Кіт',
                ],
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

        $dog = PetType::updateOrCreate(
            ['slug' => 'dog'],
            [
                'id' => 2,
                'name' => [
                    'en' => 'Dog',
                    'vi' => 'Chó',
                    'ru' => 'Собака',
                    'uk' => 'Собака',
                ],
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

        $bird = PetType::updateOrCreate(
            ['slug' => 'bird'],
            [
                'id' => 3,
                'name' => [
                    'en' => 'Bird',
                    'vi' => 'Chim',
                    'ru' => 'Птица',
                    'uk' => 'Птах',
                ],
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
            [
                'name' => [
                    'en' => 'Fish',
                    'vi' => 'Cá',
                    'ru' => 'Рыба',
                    'uk' => 'Риба'
                ],
                'slug' => 'fish',
                'description' => 'Aquatic pets'
            ],
            [
                'name' => [
                    'en' => 'Rabbit',
                    'vi' => 'Thỏ',
                    'ru' => 'Кролик',
                    'uk' => 'Кролик'
                ],
                'slug' => 'rabbit',
                'description' => 'Domestic rabbits',
                'weight_tracking_allowed' => true,
                'microchips_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Hamster',
                    'vi' => 'Chuột hamster',
                    'ru' => 'Хомяк',
                    'uk' => 'Хом’як'
                ],
                'slug' => 'hamster',
                'description' => 'Small pet rodents',
                'weight_tracking_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Guinea pig',
                    'vi' => 'Chuột lang',
                    'ru' => 'Морская свинка',
                    'uk' => 'Морська свинка'
                ],
                'slug' => 'guinea-pig',
                'description' => 'Social pet rodents',
                'weight_tracking_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Mouse',
                    'vi' => 'Chuột',
                    'ru' => 'Мышь',
                    'uk' => 'Миша'
                ],
                'slug' => 'mouse',
                'description' => 'Small pet rodents',
                'weight_tracking_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Rat',
                    'vi' => 'Chuột cống',
                    'ru' => 'Крыса',
                    'uk' => 'Щур'
                ],
                'slug' => 'rat',
                'description' => 'Intelligent pet rodents',
                'weight_tracking_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Gerbil',
                    'vi' => 'Chuột nhảy',
                    'ru' => 'Песчанка',
                    'uk' => 'Піщанка'
                ],
                'slug' => 'gerbil',
                'description' => 'Small desert rodents',
                'weight_tracking_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Ferret',
                    'vi' => 'Chồn Ferret',
                    'ru' => 'Хорек',
                    'uk' => 'Тхір'
                ],
                'slug' => 'ferret',
                'description' => 'Domesticated mustelids',
                'weight_tracking_allowed' => true,
                'microchips_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Chinchilla',
                    'vi' => 'Sóc Chinchilla',
                    'ru' => 'Шиншилла',
                    'uk' => 'Шиншила'
                ],
                'slug' => 'chinchilla',
                'description' => 'Soft-furred rodents',
                'weight_tracking_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Hedgehog',
                    'vi' => 'Nhím',
                    'ru' => 'Еж',
                    'uk' => 'Їжак'
                ],
                'slug' => 'hedgehog',
                'description' => 'Spiny mammals',
                'weight_tracking_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Sugar glider',
                    'vi' => 'Sóc bay Australia',
                    'ru' => 'Сахарная сумчатая летяга',
                    'uk' => 'Цукрова сумчаста летяга'
                ],
                'slug' => 'sugar-glider',
                'description' => 'Gliding marsupials',
                'weight_tracking_allowed' => true
            ],

            [
                'name' => [
                    'en' => 'Lizard',
                    'vi' => 'Thằn lằn',
                    'ru' => 'Ящерица',
                    'uk' => 'Ящірка'
                ],
                'slug' => 'lizard',
                'description' => 'Pet reptiles',
                'weight_tracking_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Snake',
                    'vi' => 'Rắn',
                    'ru' => 'Змея',
                    'uk' => 'Змія'
                ],
                'slug' => 'snake',
                'description' => 'Pet reptiles',
                'weight_tracking_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Turtle',
                    'vi' => 'Rùa',
                    'ru' => 'Черепаха',
                    'uk' => 'Черепаха'
                ],
                'slug' => 'turtle',
                'description' => 'Pet reptiles',
                'weight_tracking_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Frog',
                    'vi' => 'Ếch',
                    'ru' => 'Лягушка',
                    'uk' => 'Жаба'
                ],
                'slug' => 'frog',
                'description' => 'Pet amphibians',
                'weight_tracking_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Axolotl',
                    'vi' => 'Kỳ giông Axolotl',
                    'ru' => 'Аксолотль',
                    'uk' => 'Аксолотль'
                ],
                'slug' => 'axolotl',
                'description' => 'Aquatic amphibians',
                'weight_tracking_allowed' => true
            ],

            [
                'name' => [
                    'en' => 'Spider',
                    'vi' => 'Nhện',
                    'ru' => 'Паук',
                    'uk' => 'Павук'
                ],
                'slug' => 'spider',
                'description' => 'Pet arachnids'
            ],
            [
                'name' => [
                    'en' => 'Scorpion',
                    'vi' => 'Bọ cạp',
                    'ru' => 'Скорпион',
                    'uk' => 'Скорпіон'
                ],
                'slug' => 'scorpion',
                'description' => 'Pet arachnids'
            ],
            [
                'name' => [
                    'en' => 'Snail',
                    'vi' => 'Ốc sên',
                    'ru' => 'Улитка',
                    'uk' => 'Равлик'
                ],
                'slug' => 'snail',
                'description' => 'Pet mollusks'
            ],
            [
                'name' => [
                    'en' => 'Crab',
                    'vi' => 'Cua',
                    'ru' => 'Краб',
                    'uk' => 'Краб'
                ],
                'slug' => 'crab',
                'description' => 'Pet crustaceans'
            ],

            [
                'name' => [
                    'en' => 'Horse',
                    'vi' => 'Ngựa',
                    'ru' => 'Лошадь',
                    'uk' => 'Кінь'
                ],
                'slug' => 'horse',
                'description' => 'Large domesticated mammals',
                'weight_tracking_allowed' => true,
                'microchips_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Goat',
                    'vi' => 'Dê',
                    'ru' => 'Коза',
                    'uk' => 'Коза'
                ],
                'slug' => 'goat',
                'description' => 'Farm animals as pets',
                'weight_tracking_allowed' => true,
                'microchips_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Sheep',
                    'vi' => 'Cừu',
                    'ru' => 'Овца',
                    'uk' => 'Вівця'
                ],
                'slug' => 'sheep',
                'description' => 'Farm animals as pets',
                'weight_tracking_allowed' => true,
                'microchips_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Pig',
                    'vi' => 'Lợn',
                    'ru' => 'Свинья',
                    'uk' => 'Свиня'
                ],
                'slug' => 'pig',
                'description' => 'Farm animals as pets',
                'weight_tracking_allowed' => true,
                'microchips_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Donkey',
                    'vi' => 'Lừa',
                    'ru' => 'Осел',
                    'uk' => 'Осел'
                ],
                'slug' => 'donkey',
                'description' => 'Large domesticated mammals',
                'weight_tracking_allowed' => true,
                'microchips_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Cattle',
                    'vi' => 'Gia súc',
                    'ru' => 'Рогатый скот',
                    'uk' => 'Велика рогата худоба'
                ],
                'slug' => 'cattle',
                'description' => 'Farm animals as pets',
                'weight_tracking_allowed' => true,
                'microchips_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Chicken',
                    'vi' => 'Gà',
                    'ru' => 'Курица',
                    'uk' => 'Курка'
                ],
                'slug' => 'chicken',
                'description' => 'Domestic poultry',
                'weight_tracking_allowed' => true
            ],
            [
                'name' => [
                    'en' => 'Duck',
                    'vi' => 'Vịt',
                    'ru' => 'Утка',
                    'uk' => 'Качка'
                ],
                'slug' => 'duck',
                'description' => 'Domestic poultry',
                'weight_tracking_allowed' => true
            ],
        ];


        foreach ($moreTypes as $index => $data) {
            $type = PetType::updateOrCreate(
                ['slug' => $data['slug']],
                [
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
