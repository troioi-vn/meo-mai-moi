<?php

namespace Database\Seeders;

use App\Enums\PlacementRequestType;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Models\VaccinationRecord;
use App\Models\WeightHistory;
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
        $seedImageDir = base_path('database/seed_images');

        $publicPetsDir = storage_path('app/public/pets');
        if (! is_dir($publicPetsDir)) {
            @mkdir($publicPetsDir, 0775, true);
        }

        $expectedImages = [
            'bird.png',
            'cat-1.png', 'cat-2.png', 'cat-3.png', 'cat-4.png',
            'dog-1.png', 'dog-2.png', 'dog-3.png', 'dog-4.png',
        ];

        if (is_dir($seedImageDir)) {
            foreach ($expectedImages as $file) {
                $src = $seedImageDir.DIRECTORY_SEPARATOR.$file;
                $dest = $publicPetsDir.DIRECTORY_SEPARATOR.$file;
                if (file_exists($src)) {
                    try {
                        copy($src, $dest);
                    } catch (\Throwable $e) {
                        echo "Failed to copy seed image {$file}: {$e->getMessage()}".PHP_EOL;
                    }
                }
            }
        }

        // Get pet types
        $catType = PetType::where('slug', 'cat')->first();
        $dogType = PetType::where('slug', 'dog')->first();
        $birdType = PetType::where('slug', 'bird')->first();

        // Get normal users (viewers)
        $normalUsers = User::role('viewer')->orderBy('id')->get();

        if ($normalUsers->count() >= 3) {
            $user1 = $normalUsers[0];
            $user2 = $normalUsers[1];
            $user3 = $normalUsers[2];

            // User 1: 2 cats
            $user1Cats = [];
            for ($i = 1; $i <= 2; $i++) {
                $pet = $this->createPet($user1, $catType, "cat-{$i}.png");
                $user1Cats[] = $pet;
                $this->addWeightHistory($pet, $i === 1 ? 50 : rand(3, 5));
                $this->addVaccinations($pet, 2);
            }
            // One cat has a Placement Request
            $this->createPlacementRequest($user1, $user1Cats[0]);

            // User 2: 2 dogs
            for ($i = 1; $i <= 2; $i++) {
                $pet = $this->createPet($user2, $dogType, "dog-{$i}.png");
                $this->addWeightHistory($pet, rand(3, 5));
            }

            // User 3: 2 cats, 2 dogs, 1 bird
            for ($i = 1; $i <= 2; $i++) {
                $pet = $this->createPet($user3, $catType, 'cat-'.($i + 2).'.png');
                $this->addWeightHistory($pet, rand(3, 5));
            }
            for ($i = 1; $i <= 2; $i++) {
                $pet = $this->createPet($user3, $dogType, 'dog-'.($i + 2).'.png');
                $this->addWeightHistory($pet, rand(3, 5));
            }
            $this->createPet($user3, $birdType, 'bird.png');
        }
    }

    private function createPet(User $user, PetType $type, string $imageName): Pet
    {
        $pet = Pet::factory()->create([
            'created_by' => $user->id,
            'pet_type_id' => $type->id,
        ]);

        $fullPath = storage_path("app/public/pets/{$imageName}");
        if (file_exists($fullPath)) {
            try {
                $pet->addMedia($fullPath)
                    ->preservingOriginal()
                    ->toMediaCollection('photos');
            } catch (\Exception $e) {
                echo "Failed to add photo {$imageName} for pet {$pet->id}: ".$e->getMessage().PHP_EOL;
            }
        }

        return $pet;
    }

    private function addWeightHistory(Pet $pet, int $count): void
    {
        if ($pet->petType->slug === 'bird') {
            return;
        }

        $startDate = now()->subYears(5);
        $usedDates = [];

        for ($i = 0; $i < $count; $i++) {
            if ($count === 50) {
                $recordDate = (clone $startDate)->addDays($i * 36); // Roughly every 36 days over 5 years
            } else {
                // Ensure unique dates for smaller counts
                do {
                    $recordDate = now()->subDays(rand(0, 365 * 5))->startOfDay();
                } while (in_array($recordDate->toDateString(), $usedDates));
            }

            $usedDates[] = $recordDate->toDateString();

            WeightHistory::factory()->create([
                'pet_id' => $pet->id,
                'record_date' => $recordDate,
                'weight_kg' => rand(200, 1000) / 100, // 2.00 to 10.00 kg
            ]);
        }
    }

    private function addVaccinations(Pet $pet, int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            VaccinationRecord::factory()->create([
                'pet_id' => $pet->id,
                'administered_at' => now()->subMonths(($i + 1) * 6),
                'due_at' => now()->addMonths(6 - ($i * 6)),
            ]);
        }
    }

    private function createPlacementRequest(User $user, Pet $pet): void
    {
        PlacementRequest::create([
            'user_id' => $user->id,
            'pet_id' => $pet->id,
            'request_type' => PlacementRequestType::PERMANENT,
            'status' => \App\Enums\PlacementRequestStatus::OPEN,
            'notes' => 'Looking for a permanent home for my cat',
            'expires_at' => now()->addMonths(3),
            'start_date' => now()->addWeek(),
            'end_date' => null,
        ]);
    }
}
