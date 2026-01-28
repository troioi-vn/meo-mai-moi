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
            CitySeeder::class, // Seed base city list (ISO country code stored on cities)
            PetTypeSeeder::class, // Add pet types first
            CategorySeeder::class, // Add categories after pet types
            RolesAndPermissionsSeeder::class,
            UserSeeder::class,
            ShieldSeeder::class,
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

                $this->createPlacementRequest($user1, $pet);
            }

            // User 2: 2 dogs
            for ($i = 1; $i <= 2; $i++) {
                $pet = $this->createPet($user2, $dogType, "dog-{$i}.png");
                $this->addWeightHistory($pet, rand(3, 5));

                $this->createPlacementRequest($user2, $pet);
            }

            // User 3: 2 cats, 2 dogs, 1 bird
            for ($i = 1; $i <= 2; $i++) {
                $pet = $this->createPet($user3, $catType, 'cat-'.($i + 2).'.png');
                $this->addWeightHistory($pet, rand(3, 5));

                $this->createPlacementRequest($user3, $pet);
            }
            for ($i = 1; $i <= 2; $i++) {
                $pet = $this->createPet($user3, $dogType, 'dog-'.($i + 2).'.png');
                $this->addWeightHistory($pet, rand(3, 5));

                $this->createPlacementRequest($user3, $pet);
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
        $slug = $pet->petType->slug ?? 'cat';
        if ($slug === 'bird') {
            return;
        }

        // Only seed realistic weight histories for cats and dogs.
        if (! in_array($slug, ['cat', 'dog'], true)) {
            return;
        }

        $count = max(1, $count);

        // Keep consecutive measurements stable (<= 3% change per record).
        $maxStepChange = 0.03;

        // Species-specific realistic ranges (kg) and a typical adult baseline.
        // Note: these are intentionally conservative to avoid outliers in demo data.
        if ($slug === 'cat') {
            $minKg = 2.6;
            $maxKg = 6.8;
            $baseWeight = 3.6 + (rand(0, 18) / 10); // 3.6 - 5.4 kg
            $baseBandMin = $baseWeight * 0.88;
            $baseBandMax = $baseWeight * 1.12;
        } else { // dog
            $minKg = 4.0;
            $maxKg = 32.0;
            $baseWeight = 9.0 + (rand(0, 190) / 10); // 9.0 - 28.0 kg
            $baseBandMin = $baseWeight * 0.85;
            $baseBandMax = $baseWeight * 1.15;
        }

        // Start close to baseline.
        $currentWeight = $baseWeight * (1 + (rand(-15, 15) / 1000)); // +/- 1.5%

        // Generate evenly spaced dates starting from 5 years ago
        $startDate = now()->subYears(5)->startOfDay();
        $daysPerRecord = (int) (1825 / max($count, 1)); // Spread evenly across 5 years

        for ($i = 0; $i < $count; $i++) {
            $recordDate = $startDate->copy()->addDays($i * $daysPerRecord);

            // Create a gentle trend over time:
            // - early period: slight growth
            // - middle: mostly stable
            // - later: tiny drift (could be up or down)
            $t = $count > 1 ? ($i / ($count - 1)) : 0.0;

            $drift = match (true) {
                $t < 0.15 => rand(0, 12) / 1000,      // 0.0% .. +1.2%
                $t > 0.85 => rand(-8, 8) / 1000,      // -0.8% .. +0.8%
                default => rand(-4, 4) / 1000,        // -0.4% .. +0.4%
            };

            $noise = rand(-10, 10) / 1000; // -1.0% .. +1.0%

            $changePercent = $drift + $noise;
            $changePercent = max(-$maxStepChange, min($maxStepChange, $changePercent));
            $currentWeight = $currentWeight * (1 + $changePercent);

            // Hard clamp to species limits and also keep within a tighter band around baseline.
            $minWeight = max($minKg, $baseBandMin);
            $maxWeight = min($maxKg, $baseBandMax);
            $currentWeight = max($minWeight, min($maxWeight, $currentWeight));

            WeightHistory::create([
                'pet_id' => $pet->id,
                'record_date' => $recordDate->toDateString(),
                'weight_kg' => round($currentWeight, 2),
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
        $slug = strtolower((string) ($pet->petType->slug ?? ''));
        if ($slug === 'bird') {
            return;
        }

        PlacementRequest::create([
            'user_id' => $user->id,
            'pet_id' => $pet->id,
            'request_type' => PlacementRequestType::PERMANENT,
            'status' => \App\Enums\PlacementRequestStatus::OPEN,
            'notes' => 'Looking for a permanent home',
            'expires_at' => now()->addMonths(3),
            'start_date' => now()->addWeek(),
            'end_date' => null,
        ]);
    }
}
