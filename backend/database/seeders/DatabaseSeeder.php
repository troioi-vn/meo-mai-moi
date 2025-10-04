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

        // Ensure sample pet images are available.
        // In local source the images live at backend/database/seed_images/pets
        // but inside the built container backend/ contents are flattened into base_path().
        $possibleSeedDirs = [
            base_path('database/seed_images/pets'), // flattened (container build)
            base_path('backend/database/seed_images/pets'), // local dev run via artisan serve
        ];
        $seedImageDir = null;
        foreach ($possibleSeedDirs as $dir) {
            if (is_dir($dir)) { $seedImageDir = $dir; break; }
        }

        $publicPetsDir = storage_path('app/public/pets');
        if (! is_dir($publicPetsDir)) {
            @mkdir($publicPetsDir, 0775, true);
        }

        $expectedPairs = [];
        foreach (range(1,5) as $n) { $expectedPairs[] = ["cat{$n}.jpeg", 'Cat']; $expectedPairs[] = ["dog{$n}.jpeg", 'Dog']; }

        if ($seedImageDir) {
            foreach ($expectedPairs as [$file]) {
                $src = $seedImageDir.DIRECTORY_SEPARATOR.$file;
                $dest = $publicPetsDir.DIRECTORY_SEPARATOR.$file;
                if (file_exists($src) && ! file_exists($dest)) {
                    try { copy($src, $dest); } catch (\Throwable $e) { echo "Failed to copy seed image {$file}: {$e->getMessage()}".PHP_EOL; }
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
                }
            }
        }
    }
}
