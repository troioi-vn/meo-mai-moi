<?php

namespace Database\Seeders;

use App\Models\Pet;
use App\Models\PetPhoto;
use App\Models\PetType;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            PetTypeSeeder::class, // Add pet types first
            RolesAndPermissionsSeeder::class,
            UserSeeder::class,
            HelperProfileSeeder::class,
            PlacementRequestSeeder::class,
            ShieldSeeder::class,
            ReviewSeeder::class,
            NotificationPreferenceSeeder::class,
            EmailConfigurationSeeder::class,
        ]);

        // Get pet types
        $catType = PetType::where('slug', 'cat')->first();
        $dogType = PetType::where('slug', 'dog')->first();

        $users = User::all();
        foreach ($users as $user) {
            // Create one cat and one dog per user with photos
            if ($catType) {
                $cat = Pet::factory()->create([
                    'user_id' => $user->id,
                    'pet_type_id' => $catType->id,
                ]);

                // Add a random cat photo
                $catImageNumber = rand(1, 5);
                $catImagePath = "pets/cat{$catImageNumber}.jpeg";
                $fullCatPath = storage_path("app/public/{$catImagePath}");

                if (file_exists($fullCatPath)) {
                    try {
                        PetPhoto::create([
                            'pet_id' => $cat->id,
                            'filename' => "cat{$catImageNumber}.jpeg",
                            'path' => $catImagePath,
                            'size' => filesize($fullCatPath),
                            'mime_type' => 'image/jpeg',
                            'created_by' => $user->id,
                        ]);
                    } catch (\Exception $e) {
                        echo "Failed to create cat photo for pet {$cat->id}: ".$e->getMessage().PHP_EOL;
                    }
                } else {
                    echo "Cat image not found: {$fullCatPath}".PHP_EOL;
                }
            }

            if ($dogType) {
                $dog = Pet::factory()->create([
                    'user_id' => $user->id,
                    'pet_type_id' => $dogType->id,
                ]);

                // Add a random dog photo
                $dogImageNumber = rand(1, 5);
                $dogImagePath = "pets/dog{$dogImageNumber}.jpeg";
                $fullDogPath = storage_path("app/public/{$dogImagePath}");

                if (file_exists($fullDogPath)) {
                    try {
                        PetPhoto::create([
                            'pet_id' => $dog->id,
                            'filename' => "dog{$dogImageNumber}.jpeg",
                            'path' => $dogImagePath,
                            'size' => filesize($fullDogPath),
                            'mime_type' => 'image/jpeg',
                            'created_by' => $user->id,
                        ]);
                    } catch (\Exception $e) {
                        echo "Failed to create dog photo for pet {$dog->id}: ".$e->getMessage().PHP_EOL;
                    }
                } else {
                    echo "Dog image not found: {$fullDogPath}".PHP_EOL;
                }
            }
        }
    }
}
