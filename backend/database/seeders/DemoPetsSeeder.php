<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\PetRelationshipType;
use App\Enums\PetSex;
use App\Enums\PetStatus;
use App\Models\MedicalRecord;
use App\Models\Pet;
use App\Models\PetMicrochip;
use App\Models\PetType;
use App\Models\User;
use App\Models\VaccinationRecord;
use App\Models\WeightHistory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Throwable;

/**
 * The household behind the public demo.
 *
 * Every development deploy wipes and reseeds the demo, so this is the state a
 * first-time visitor lands in. It is the product's shop window: five animals
 * with real histories rather than one empty account, because "add your first
 * pet" tells a visitor nothing about what the app is for.
 *
 * Everything is dated relative to now, so the demo never looks abandoned. A
 * fixed date would quietly rot into "last seen 2026" a year from now.
 *
 * See docs/e2e-ci.md for how this runs.
 */
class DemoPetsSeeder extends Seeder
{
    private const ASSET_DIR = __DIR__.'/assets/demo';

    public function run(): void
    {
        $demo = User::query()->where('email', config('demo.user_email'))->first();

        if ($demo === null) {
            $this->command?->warn('Demo user not found; skipping demo pets.');

            return;
        }

        foreach ($this->household() as $spec) {
            $this->createPet($demo, $spec);
        }

        $this->command?->info('🐈 Demo household seeded: '.Pet::query()->where('created_by', $demo->id)->count().' pets.');
    }

    /**
     * Two cats, two dogs and a bird. Names and details are invented; nothing
     * here refers to a real animal.
     *
     * @return array<int, array<string, mixed>>
     */
    private function household(): array
    {
        return [
            [
                'name' => 'Biscuit',
                'type' => 'cat',
                'sex' => PetSex::MALE,
                'image' => 'cat-1.png',
                'age_months' => 92,
                'description' => "Came in off the street with a torn ear and strong opinions. Now supervises the kitchen from the top of the fridge and considers the laundry basket his private office. Slow to trust new people, entirely devoted once he does.",
                'chip' => ['9410000123456781', 'Petmaxx Asia'],
                'weight' => ['start' => 4.1, 'end' => 5.2, 'points' => 9],
                'records' => [
                    ['vet_visit', -20, 'Annual check. Dental tartar noted on the upper molars, no extraction needed yet.', 'Dr. Linh Pham'],
                    ['treatment', -14, 'Dental scale and polish under light sedation. Recovered well, eating the same evening.', 'Dr. Linh Pham'],
                    ['medication', -6, 'Two-week course of joint supplement started, given with breakfast.', 'Dr. Linh Pham'],
                    ['vet_visit', -2, 'Weight and mobility check. Moving comfortably; keep the supplement going.', 'Dr. Linh Pham'],
                ],
                'vaccines' => [
                    ['Feline trivalent (FVRCP)', -11, 1],
                    ['Rabies', -11, 1],
                ],
            ],
            [
                'name' => 'Sao',
                'type' => 'cat',
                'sex' => PetSex::FEMALE,
                'image' => 'cat-2.png',
                'age_months' => 19,
                'description' => "Found under a parked scooter at three weeks old and bottle-raised. Talks constantly, mostly in the mornings and mostly about breakfast. Will fetch a hair tie until your arm gives out.",
                'chip' => ['9410000123456782', 'Petmaxx Asia'],
                'weight' => ['start' => 2.4, 'end' => 3.6, 'points' => 11],
                'records' => [
                    ['vet_visit', -13, 'First full examination after hand-rearing. Slightly underweight, otherwise healthy.', 'Dr. Anh Nguyen'],
                    ['treatment', -9, 'Spay surgery. Straightforward, sutures out after ten days.', 'Dr. Anh Nguyen'],
                    ['vet_visit', -3, 'Growth check. Weight now in the normal range for her age.', 'Dr. Anh Nguyen'],
                ],
                'vaccines' => [
                    ['Feline trivalent (FVRCP)', -9, 3],
                    ['Rabies', -9, 3],
                ],
            ],
            [
                'name' => 'Bao',
                'type' => 'dog',
                'sex' => PetSex::MALE,
                'image' => 'dog-1.png',
                'age_months' => 46,
                'description' => "Street dog by birth, sofa dog by ambition. Walks beautifully on the lead until he sees a bicycle. Knows sit, stay, and the exact sound the treat drawer makes from two rooms away.",
                'chip' => ['9410000123456783', 'Vietnam Pet Registry'],
                'weight' => ['start' => 17.4, 'end' => 19.1, 'points' => 10],
                'records' => [
                    ['vet_visit', -17, 'Routine health check and nail trim. Ears clean, teeth good.', 'Dr. Minh Tran'],
                    ['medication', -8, 'Monthly tick and flea preventative started ahead of the wet season.', 'Dr. Minh Tran'],
                    ['vet_visit', -1, 'Limp on the left hind after a long walk. No swelling; rest advised for a week.', 'Dr. Minh Tran'],
                ],
                'vaccines' => [
                    ['Canine DHPP', -10, 2],
                    ['Rabies', -10, 2],
                    ['Leptospirosis', -4, 8],
                ],
            ],
            [
                'name' => 'Fern',
                'type' => 'dog',
                'sex' => PetSex::FEMALE,
                'image' => 'dog-2.png',
                'age_months' => 28,
                'description' => "Nervous at the shelter, unrecognisable six months later. Sleeps against the door of whichever room you are in. Terrified of thunderstorms and completely unbothered by fireworks, which nobody has explained.",
                'chip' => ['9410000123456784', 'Vietnam Pet Registry'],
                'weight' => ['start' => 12.8, 'end' => 14.6, 'points' => 12],
                'records' => [
                    ['vet_visit', -15, 'Intake examination. Underweight and anxious; no medical cause found.', 'Dr. Minh Tran'],
                    ['treatment', -12, 'Spay surgery, uneventful. Cone tolerated with visible disgust.', 'Dr. Minh Tran'],
                    ['other', -5, 'Six-week reactivity course completed. Handler notes steady improvement around traffic.', 'Ha Long Dog School'],
                    ['vet_visit', -1, 'Weight and body condition now ideal. No follow-up needed.', 'Dr. Minh Tran'],
                ],
                'vaccines' => [
                    ['Canine DHPP', -12, 0],
                    ['Rabies', -12, 0],
                ],
            ],
            [
                'name' => 'Kiwi',
                'type' => 'bird',
                'sex' => PetSex::FEMALE,
                'image' => 'bird.png',
                'age_months' => 34,
                'description' => "Rehomed when her previous family moved abroad. Whistles the first three notes of a song nobody has identified. Out of the cage most of the day, and has firm views about which shoulder is hers.",
                // Birds are ringed rather than chipped, and the app records that
                // as an ordinary note rather than pretending it is a microchip.
                'chip' => null,
                'weight' => ['start' => 0.032, 'end' => 0.037, 'points' => 8],
                'records' => [
                    ['other', -18, 'Closed leg ring VN-2024-0431 recorded at handover, along with previous keeper notes.', 'Ha Long Avian Clinic'],
                    ['vet_visit', -12, 'Beak and claw trim, general check. Plumage in good condition.', 'Dr. Thu Vo'],
                    ['vet_visit', -4, 'Annual check. Slight weight gain; seed mix reduced in favour of vegetables.', 'Dr. Thu Vo'],
                ],
                'vaccines' => [],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $spec
     */
    private function createPet(User $demo, array $spec): void
    {
        $type = PetType::query()->where('slug', $spec['type'])->first();

        if ($type === null) {
            $this->command?->warn("Pet type '{$spec['type']}' is missing; skipping {$spec['name']}.");

            return;
        }

        $birthday = Carbon::now()->subMonths((int) $spec['age_months'])->startOfDay();

        $pet = Pet::query()->updateOrCreate(
            ['name' => $spec['name'], 'created_by' => $demo->id],
            [
                'pet_type_id' => $type->id,
                'sex' => $spec['sex'],
                'status' => PetStatus::ACTIVE,
                'description' => $spec['description'],
                'birthday' => $birthday,
                'birthday_year' => (int) $birthday->year,
                'birthday_month' => (int) $birthday->month,
                'birthday_day' => (int) $birthday->day,
                'birthday_precision' => 'day',
                'country' => 'VN',
                'city' => 'Ha Long',
            ]
        );

        // The demo account has to appear as an owner, not merely as the record's
        // author: the UI reads ownership from pet_relationships.
        $pet->owners()->syncWithoutDetaching([
            $demo->id => [
                'relationship_type' => PetRelationshipType::OWNER->value,
                'start_at' => $birthday,
                'created_by' => $demo->id,
            ],
        ]);

        $this->attachPhoto($pet, (string) $spec['image']);
        $this->addWeightSeries($pet, $spec['weight']);
        $this->addRecords($pet, $spec['records']);
        $this->addVaccinations($pet, $spec['vaccines']);

        if (is_array($spec['chip'] ?? null)) {
            PetMicrochip::query()->updateOrCreate(
                ['pet_id' => $pet->id],
                [
                    'chip_number' => $spec['chip'][0],
                    'issuer' => $spec['chip'][1],
                    'implanted_at' => $birthday->copy()->addMonths(3),
                ]
            );
        }
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

    /**
     * A gently rising series rather than random noise, so the weight chart in
     * the UI reads as a real animal growing rather than a jitter plot.
     *
     * @param  array{start: float, end: float, points: int}  $spec
     */
    private function addWeightSeries(Pet $pet, array $spec): void
    {
        $points = max(2, $spec['points']);
        $step = ($spec['end'] - $spec['start']) / ($points - 1);

        for ($i = 0; $i < $points; $i++) {
            $date = Carbon::now()->subWeeks(($points - 1 - $i) * 6)->startOfDay();
            $wobble = (($i % 3) - 1) * ($step * 0.15);
            $weight = round($spec['start'] + ($step * $i) + $wobble, 3);

            WeightHistory::query()->updateOrCreate(
                ['pet_id' => $pet->id, 'record_date' => $date],
                ['weight_kg' => max(0.001, $weight)]
            );
        }
    }

    /**
     * @param  array<int, array{0: string, 1: int, 2: string, 3: string}>  $records
     */
    private function addRecords(Pet $pet, array $records): void
    {
        foreach ($records as [$type, $monthsAgo, $description, $vet]) {
            MedicalRecord::query()->updateOrCreate(
                ['pet_id' => $pet->id, 'description' => $description],
                [
                    'record_type' => $type,
                    'record_date' => Carbon::now()->subMonths(abs($monthsAgo))->startOfDay(),
                    'vet_name' => $vet,
                ]
            );
        }
    }

    /**
     * Due dates are set a year on from administration, which puts a couple of
     * them in the near future on purpose: the reminder surfaces are worth
     * showing a visitor, and they only appear when something is actually due.
     *
     * @param  array<int, array{0: string, 1: int, 2: int}>  $vaccines
     */
    private function addVaccinations(Pet $pet, array $vaccines): void
    {
        foreach ($vaccines as [$name, $monthsAgo, $dueInMonths]) {
            $administered = Carbon::now()->subMonths(abs($monthsAgo))->startOfDay();

            VaccinationRecord::query()->updateOrCreate(
                ['pet_id' => $pet->id, 'vaccine_name' => $name, 'administered_at' => $administered],
                [
                    'due_at' => Carbon::now()->addMonths($dueInMonths)->startOfDay(),
                    'notes' => 'Administered at the clinic; certificate on file.',
                ]
            );
        }
    }
}
