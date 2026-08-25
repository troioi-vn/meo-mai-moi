<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\PetRelationshipType;
use App\Enums\PetSex;
use App\Enums\PetStatus;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Models\WeightHistory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Throwable;

/**
 * Open placement requests for the demo visitor to respond to.
 *
 * These pets belong to *other* seeded accounts on purpose: you cannot respond
 * to your own request, so a demo where every request is the demo user's own is
 * a demo where the Respond button does nothing.
 *
 * Three requests, one per placement type worth showing, each with a photo, an
 * age and a reason someone would actually write. The alternative is what the
 * e2e suite leaves behind on its own - "Placement Pet 1787677044150", no photo,
 * age unknown - which tells a visitor nothing except that this is a test
 * fixture.
 *
 * See docs/e2e-ci.md.
 */
class DemoPlacementSeeder extends Seeder
{
    private const ASSET_DIR = __DIR__.'/assets/demo';

    public function run(): void
    {
        foreach ($this->requests() as $spec) {
            $this->createRequest($spec);
        }

        $open = PlacementRequest::query()->where('status', PlacementRequestStatus::OPEN)->count();
        $this->command?->info("🏠 Demo placement requests seeded; {$open} open in total.");
    }

    /**
     * Owners are the accounts UserSeeder already creates, so this seeder adds
     * no new logins to explain.
     *
     * @return array<int, array<string, mixed>>
     */
    private function requests(): array
    {
        return [
            [
                'owner' => 'user1@catarchy.space',
                'name' => 'Mochi',
                'type' => 'cat',
                'sex' => PetSex::FEMALE,
                'image' => 'cat-3.png',
                'age_months' => 14,
                'weight' => 3.4,
                'description' => 'Quiet, tidy and completely litter trained. Gets on with other cats after a slow introduction, and has never met a cardboard box she did not want to sit in.',
                'request_type' => PlacementRequestType::PERMANENT,
                'notes' => 'Moving abroad in November and cannot take her with me. Looking for a calm home, ideally without young children. Happy to cover the first vet visit and hand over her carrier and bed.',
                'expires_in_days' => 45,
                'start_in_days' => 21,
                'end_in_days' => null,
            ],
            [
                'owner' => 'invitee@catarchy.space',
                'name' => 'Pepper',
                'type' => 'cat',
                'sex' => PetSex::MALE,
                'image' => 'cat-4.png',
                'age_months' => 63,
                'weight' => 4.8,
                'description' => 'Confident older tomcat, neutered and fully vaccinated. Sleeps most of the day and wants company in the evening. Indoor only since a road incident two years ago.',
                'request_type' => PlacementRequestType::FOSTER_FREE,
                'notes' => 'I am in hospital for surgery and need someone to take him for about six weeks. All food and litter provided. He is easy to look after, just needs someone in the house most evenings.',
                'expires_in_days' => 20,
                'start_in_days' => 7,
                'end_in_days' => 49,
            ],
            [
                'owner' => 'user1@catarchy.space',
                'name' => 'Suki',
                'type' => 'dog',
                'sex' => PetSex::FEMALE,
                'image' => 'dog-2.png',
                'age_months' => 33,
                'weight' => 11.2,
                'description' => 'Medium-sized, house trained, good on the lead and fine with other dogs. Nervous around motorbikes, so a quieter street suits her best.',
                'request_type' => PlacementRequestType::PET_SITTING,
                'notes' => 'Away for two weeks in October and would rather she stayed in a home than a kennel. She needs two walks a day and eats twice. Happy to meet beforehand so you both know what you are getting.',
                'expires_in_days' => 30,
                'start_in_days' => 30,
                'end_in_days' => 44,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $spec
     */
    private function createRequest(array $spec): void
    {
        $owner = User::query()->where('email', $spec['owner'])->first();
        $type = PetType::query()->where('slug', $spec['type'])->first();

        if ($owner === null || $type === null) {
            $this->command?->warn("Skipping {$spec['name']}: owner or pet type missing.");

            return;
        }

        $birthday = Carbon::now()->subMonths((int) $spec['age_months'])->startOfDay();

        $pet = Pet::query()->updateOrCreate(
            ['name' => $spec['name'], 'created_by' => $owner->id],
            [
                'pet_type_id' => $type->id,
                'sex' => $spec['sex'],
                'status' => PetStatus::ACTIVE,
                'description' => $spec['description'],
                'birthday' => $birthday,
                'birthday_year' => (int) $birthday->year,
                'birthday_month' => (int) $birthday->month,
                'birthday_day' => (int) $birthday->day,
                // Without a precision the card renders "Age unknown", which is
                // half of what makes the e2e leftovers look like debris.
                'birthday_precision' => 'day',
                'country' => 'VN',
                'city' => 'Ha Long',
            ]
        );

        $pet->owners()->syncWithoutDetaching([
            $owner->id => [
                'relationship_type' => PetRelationshipType::OWNER->value,
                'start_at' => $birthday,
                'created_by' => $owner->id,
            ],
        ]);

        $this->attachPhoto($pet, (string) $spec['image']);

        WeightHistory::query()->updateOrCreate(
            ['pet_id' => $pet->id, 'record_date' => Carbon::now()->subWeeks(2)->startOfDay()],
            ['weight_kg' => $spec['weight']]
        );

        PlacementRequest::query()->updateOrCreate(
            ['pet_id' => $pet->id, 'user_id' => $owner->id],
            [
                'request_type' => $spec['request_type'],
                'status' => PlacementRequestStatus::OPEN,
                'notes' => $spec['notes'],
                'expires_at' => Carbon::now()->addDays((int) $spec['expires_in_days'])->startOfDay(),
                'start_date' => Carbon::now()->addDays((int) $spec['start_in_days'])->startOfDay(),
                'end_date' => $spec['end_in_days'] === null
                    ? null
                    : Carbon::now()->addDays((int) $spec['end_in_days'])->startOfDay(),
            ]
        );
    }

    private function attachPhoto(Pet $pet, string $image): void
    {
        if ($pet->getMedia('photos')->isNotEmpty()) {
            return;
        }

        $path = self::ASSET_DIR.'/'.$image;

        if (! is_file($path)) {
            $this->command?->warn("Demo photo missing: {$path}");

            return;
        }

        try {
            $pet->addMedia($path)->preservingOriginal()->toMediaCollection('photos');
        } catch (Throwable $e) {
            $this->command?->warn("Could not attach {$image} to {$pet->name}: ".$e->getMessage());
        }
    }
}
