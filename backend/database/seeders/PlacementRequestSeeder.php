<?php

namespace Database\Seeders;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Models\Pet;
use App\Models\PlacementRequest;
use Illuminate\Database\Seeder;

class PlacementRequestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Backfill placement requests for already-seeded pets.
     *
     * This seeder is intentionally idempotent: it only creates a placement request
     * for pets that don't already have one.
     */
    public function run(): void
    {
        $created = 0;
        $skippedExisting = 0;
        $skippedBirds = 0;
        $skippedNoCreator = 0;

        Pet::query()
            ->with('petType')
            ->whereHas('petType', function ($query) {
                $query->whereIn('slug', ['cat', 'dog']);
            })
            ->orderBy('id')
            ->chunkById(100, function ($pets) use (&$created, &$skippedExisting, &$skippedBirds, &$skippedNoCreator): void {
                foreach ($pets as $pet) {
                    $slug = strtolower((string) ($pet->petType->slug ?? ''));
                    if ($slug === 'bird') {
                        $skippedBirds++;
                        continue;
                    }

                    if (PlacementRequest::where('pet_id', $pet->id)->exists()) {
                        $skippedExisting++;
                        continue;
                    }

                    $userId = $pet->created_by;
                    if (! $userId) {
                        $skippedNoCreator++;
                        continue;
                    }

                    PlacementRequest::create([
                        'user_id' => $userId,
                        'pet_id' => $pet->id,
                        'request_type' => PlacementRequestType::PERMANENT,
                        'status' => PlacementRequestStatus::OPEN,
                        'notes' => 'Looking for a permanent home',
                        'expires_at' => now()->addMonths(3),
                        'start_date' => now()->addWeek(),
                        'end_date' => null,
                    ]);

                    $created++;
                }
            });

        if ($this->command) {
            $this->command->info("PlacementRequestSeeder: created {$created}");
            $this->command->info("PlacementRequestSeeder: skipped existing {$skippedExisting}");
            $this->command->info("PlacementRequestSeeder: skipped birds {$skippedBirds}");
            $this->command->info("PlacementRequestSeeder: skipped missing creator {$skippedNoCreator}");
        }
    }
}
