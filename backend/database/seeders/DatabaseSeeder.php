<?php

namespace Database\Seeders;

use App\Enums\PlacementRequestType;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\PlacementRequest;
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
            CategorySeeder::class, // Add categories after pet types
            RolesAndPermissionsSeeder::class,
            UserSeeder::class,
            ShieldSeeder::class,
            ReviewSeeder::class,
            NotificationPreferenceSeeder::class,
            EmailConfigurationSeeder::class,
            NotificationTemplateSeeder::class,
        ]);

        // Ensure sample pet images are available.
        // In local source the images live at backend/database/seed_images/pets
        // but inside the built container backend/ contents are flattened into base_path().
        $possibleSeedDirs = [
            base_path('database/seed_images/pets'), // flattened (container build)
            base_path('backend/database/seed_images/pets'), // local dev run via artisan serve
        ];
        $seedImageDir = null;
        foreach ($possibleSeedDirs as $dir) {
            if (is_dir($dir)) {
                $seedImageDir = $dir;
                break;
            }
        }

        $publicPetsDir = storage_path('app/public/pets');
        if (! is_dir($publicPetsDir)) {
            @mkdir($publicPetsDir, 0775, true);
        }

        $expectedPairs = [];
        foreach (range(1, 5) as $n) {
            $expectedPairs[] = ["cat{$n}.jpeg", 'Cat'];
            $expectedPairs[] = ["dog{$n}.jpeg", 'Dog'];
        }

        if ($seedImageDir) {
            foreach ($expectedPairs as [$file]) {
                $src = $seedImageDir.DIRECTORY_SEPARATOR.$file;
                $dest = $publicPetsDir.DIRECTORY_SEPARATOR.$file;
                if (file_exists($src) && ! file_exists($dest)) {
                    try {
                        copy($src, $dest);
                    } catch (\Throwable $e) {
                        echo "Failed to copy seed image {$file}: {$e->getMessage()}".PHP_EOL;
                    }
                }
            }
        }

        // Generate placeholders for any missing expected images (GD must be installed; included in Dockerfile)
        foreach ($expectedPairs as [$file, $label]) {
            $dest = $publicPetsDir.DIRECTORY_SEPARATOR.$file;
            if (! file_exists($dest) && function_exists('imagecreate')) {
                try {
                    $im = imagecreatetruecolor(600, 600);
                    $bg = imagecolorallocate($im, 240, 240, 240);
                    $accent = imagecolorallocate($im, 80, 80, 80);
                    imagefilledrectangle($im, 0, 0, 600, 600, $bg);
                    $text = strtoupper(pathinfo($file, PATHINFO_FILENAME)); // e.g. CAT1
                    // simple text placement
                    imagestring($im, 5, 20, 20, $label.' Placeholder', $accent);
                    imagestring($im, 5, 20, 50, $text, $accent);
                    imagejpeg($im, $dest, 85);
                    imagedestroy($im);
                } catch (\Throwable $e) {
                    echo "Failed to generate placeholder {$file}: {$e->getMessage()}".PHP_EOL;
                }
            }
        }

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

                // Add a random cat photo using MediaLibrary
                $catImageNumber = rand(1, 5);
                $catImagePath = "pets/cat{$catImageNumber}.jpeg";
                $fullCatPath = storage_path("app/public/{$catImagePath}");

                if (file_exists($fullCatPath)) {
                    try {
                        $cat->addMedia($fullCatPath)
                            ->preservingOriginal()
                            ->toMediaCollection('photos');
                    } catch (\Exception $e) {
                        echo "Failed to create cat photo for pet {$cat->id}: ".$e->getMessage().PHP_EOL;
                    }
                }
            }

            if ($dogType) {
                $dog = Pet::factory()->create([
                    'user_id' => $user->id,
                    'pet_type_id' => $dogType->id,
                ]);

                // Add a random dog photo using MediaLibrary
                $dogImageNumber = rand(1, 5);
                $dogImagePath = "pets/dog{$dogImageNumber}.jpeg";
                $fullDogPath = storage_path("app/public/{$dogImagePath}");

                if (file_exists($fullDogPath)) {
                    try {
                        $dog->addMedia($fullDogPath)
                            ->preservingOriginal()
                            ->toMediaCollection('photos');
                    } catch (\Exception $e) {
                        echo "Failed to create dog photo for pet {$dog->id}: ".$e->getMessage().PHP_EOL;
                    }
                }
            }
        }

        // Create placement requests for regular users
        $regularUsers = User::whereNotIn('email', ['admin@catarchy.space', 'user1@catarchy.space'])->get();
        foreach ($regularUsers as $user) {
            $pets = Pet::where('user_id', $user->id)->get();

            if ($pets->isNotEmpty()) {
                // Create a permanent placement request for the first pet
                PlacementRequest::create([
                    'user_id' => $user->id,
                    'pet_id' => $pets->first()->id,
                    'request_type' => PlacementRequestType::PERMANENT,
                    'status' => \App\Enums\PlacementRequestStatus::OPEN,
                    'notes' => 'Looking for a permanent home for my pet',
                    'expires_at' => now()->addMonths(3),
                    'start_date' => now()->addWeek(),
                    'end_date' => now()->addMonths(6),
                    'fulfilled_at' => null,
                    'fulfilled_by_transfer_request_id' => null,
                ]);
            }

            if ($pets->count() > 1) {
                // Create a foster (temporary) placement request for the second pet
                PlacementRequest::create([
                    'user_id' => $user->id,
                    'pet_id' => $pets[1]->id,
                    'request_type' => PlacementRequestType::FOSTER_FREE,
                    'status' => \App\Enums\PlacementRequestStatus::OPEN,
                    'notes' => 'Need temporary care for my pet',
                    'expires_at' => now()->addMonths(2),
                    'start_date' => now()->addDays(3),
                    'end_date' => now()->addMonths(1),
                    'fulfilled_at' => null,
                    'fulfilled_by_transfer_request_id' => null,
                ]);
            }
        }
    }
}
