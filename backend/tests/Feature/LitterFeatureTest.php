<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\City;
use App\Models\Litter;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use App\Models\WeightHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LitterFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function createPetType(string $name, string $slug, bool $supportsLitters = true, int $order = 0): PetType
    {
        return PetType::create([
            'name' => $name,
            'slug' => $slug,
            'is_system' => true,
            'display_order' => $order,
            'supports_litters' => $supportsLitters,
        ]);
    }

    #[Test]
    public function creating_a_litter_persists_litter_and_all_members_with_litter_id(): void
    {
        $cat = $this->createPetType('Cat', 'cat', true, 0);
        $city = City::factory()->create(['country' => 'VN']);
        $user = User::factory()->create();

        $this->actingAs($user);

        $payload = [
            'name' => 'My Litter',
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'city_id' => $city->id,
            'state' => 'Hanoi',
            'address' => '123 Street',
            'description' => 'Found in box',
            'birthday_precision' => 'unknown',
            'members' => [
                ['sex' => 'female'],
                ['sex' => 'male', 'name' => 'Custom'],
                ['sex' => 'female', 'weight_kg' => 0.35],
            ],
        ];

        $response = $this->postJson('/api/litters', $payload);
        $response->assertStatus(201);
        $response->assertJsonStructure(['data' => ['id', 'name', 'pet_type_id', 'created_by', 'pets']]);

        $data = $response->json('data');
        $this->assertEquals('My Litter', $data['name']);
        $this->assertEquals($cat->id, $data['pet_type_id']);
        $this->assertCount(3, $data['pets']);

        $litterId = $data['id'];
        $this->assertDatabaseHas('litters', ['id' => $litterId, 'name' => 'My Litter', 'pet_type_id' => $cat->id, 'created_by' => $user->id]);

        foreach ($data['pets'] as $petData) {
            $this->assertEquals($litterId, $petData['litter_id']);
            $this->assertDatabaseHas('pets', ['id' => $petData['id'], 'litter_id' => $litterId, 'pet_type_id' => $cat->id]);
        }

        // shared attributes copied onto each pet
        foreach (Pet::where('litter_id', $litterId)->get() as $pet) {
            $this->assertEquals('VN', $pet->country);
            $this->assertEquals($city->id, $pet->city_id);
            $this->assertEquals('Hanoi', $pet->state);
        }
    }

    #[Test]
    public function litter_creation_is_atomic_when_one_member_fails(): void
    {
        $cat = $this->createPetType('Cat', 'cat', true, 0);
        $user = User::factory()->create();
        $this->actingAs($user);

        $initialLitters = Litter::count();
        $initialPets = Pet::count();

        // second member has name too long (300 chars) -> validation 422 before service
        $response = $this->postJson('/api/litters', [
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'members' => [
                ['sex' => 'female'],
                ['sex' => 'male', 'name' => str_repeat('a', 300)],
                ['sex' => 'female'],
            ],
        ]);

        $response->assertStatus(422);
        $this->assertEquals($initialLitters, Litter::count());
        $this->assertEquals($initialPets, Pet::count());
    }

    #[Test]
    public function rejects_pet_type_without_supports_litters(): void
    {
        $cat = $this->createPetType('Cat', 'cat', true, 0);
        $bird = $this->createPetType('Bird', 'bird', false, 2);
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->postJson('/api/litters', [
            'pet_type_id' => $bird->id,
            'country' => 'VN',
            'members' => [['sex' => 'female'], ['sex' => 'male']],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['pet_type_id']);
        $this->assertDatabaseMissing('litters', ['pet_type_id' => $bird->id]);
    }

    #[Test]
    public function rejects_too_few_members(): void
    {
        $cat = $this->createPetType('Cat', 'cat', true, 0);
        $user = User::factory()->create();
        $this->actingAs($user);

        $min = (int) config('litters.min_members', 2);
        $tooFew = $min - 1;
        $members = array_fill(0, $tooFew, ['sex' => 'female']);

        $response = $this->postJson('/api/litters', [
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'members' => $members,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['members']);
    }

    #[Test]
    public function rejects_too_many_members(): void
    {
        $cat = $this->createPetType('Cat', 'cat', true, 0);
        $user = User::factory()->create();
        $this->actingAs($user);

        $max = (int) config('litters.max_members', 12);
        $tooMany = $max + 1;
        $members = array_fill(0, $tooMany, ['sex' => 'female']);

        $response = $this->postJson('/api/litters', [
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'members' => $members,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['members']);
    }

    #[Test]
    public function placeholder_names_are_species_aware(): void
    {
        $cat = $this->createPetType('Cat', 'cat', true, 0);
        $dog = $this->createPetType('Dog', 'dog', true, 1);
        $user = User::factory()->create();
        $this->actingAs($user);

        $catResp = $this->postJson('/api/litters', [
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'members' => [['sex' => 'female'], ['sex' => 'male']],
        ]);
        $catResp->assertStatus(201);
        $catNames = collect($catResp->json('data.pets'))->pluck('name')->all();
        $this->assertContains('Kitten 1', $catNames);
        $this->assertContains('Kitten 2', $catNames);

        $dogResp = $this->postJson('/api/litters', [
            'pet_type_id' => $dog->id,
            'country' => 'VN',
            'members' => [['sex' => 'female'], ['sex' => 'male']],
        ]);
        $dogResp->assertStatus(201);
        $dogNames = collect($dogResp->json('data.pets'))->pluck('name')->all();
        $this->assertContains('Puppy 1', $dogNames);
        $this->assertContains('Puppy 2', $dogNames);

        // ensure cat and dog placeholders differ
        $this->assertNotEquals($catNames, $dogNames);
    }

    #[Test]
    public function placeholder_fallback_uses_pet_type_name(): void
    {
        $rabbit = $this->createPetType('Rabbit', 'rabbit', true, 5);
        $user = User::factory()->create();
        $this->actingAs($user);

        $resp = $this->postJson('/api/litters', [
            'pet_type_id' => $rabbit->id,
            'country' => 'VN',
            'members' => [['sex' => 'female'], ['sex' => 'male']],
        ]);
        $resp->assertStatus(201);
        $names = collect($resp->json('data.pets'))->pluck('name')->all();
        $this->assertContains('Rabbit 1', $names);
        $this->assertContains('Rabbit 2', $names);
    }

    #[Test]
    public function explicit_member_name_is_preserved(): void
    {
        $cat = $this->createPetType('Cat', 'cat', true, 0);
        $user = User::factory()->create();
        $this->actingAs($user);

        $resp = $this->postJson('/api/litters', [
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'members' => [
                ['sex' => 'female', 'name' => 'Mittens'],
                ['sex' => 'male'],
            ],
        ]);
        $resp->assertStatus(201);
        $names = collect($resp->json('data.pets'))->pluck('name')->all();
        $this->assertContains('Mittens', $names);
        // the other member should be placeholder, not overwritten
        $this->assertContains('Kitten 2', $names);
    }

    #[Test]
    public function weight_creates_history_and_omitting_creates_none(): void
    {
        $cat = $this->createPetType('Cat', 'cat', true, 0);
        $user = User::factory()->create();
        $this->actingAs($user);

        $resp = $this->postJson('/api/litters', [
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'members' => [
                ['sex' => 'female', 'weight_kg' => 0.45],
                ['sex' => 'male'],
            ],
        ]);
        $resp->assertStatus(201);
        $pets = $resp->json('data.pets');
        $withWeight = collect($pets)->firstWhere('name', 'Kitten 1');
        $withoutWeight = collect($pets)->firstWhere('name', 'Kitten 2');
        // the member with weight_kg should have a WeightHistory dated today
        $this->assertDatabaseHas('weight_histories', ['pet_id' => $withWeight['id'], 'weight_kg' => 0.45]);
        $today = today()->toDateString();
        $history = WeightHistory::where('pet_id', $withWeight['id'])->first();
        $this->assertNotNull($history);
        $this->assertEquals($today, $history->record_date->toDateString());
        // the other member should have no history
        $this->assertDatabaseMissing('weight_histories', ['pet_id' => $withoutWeight['id']]);
    }

    #[Test]
    public function get_returns_litter_with_members(): void
    {
        $cat = $this->createPetType('Cat', 'cat', true, 0);
        $city = City::factory()->create(['country' => 'VN']);
        $user = User::factory()->create();
        $this->actingAs($user);

        $created = $this->postJson('/api/litters', [
            'name' => 'Test Litter',
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'city_id' => $city->id,
            'members' => [['sex' => 'female'], ['sex' => 'male']],
        ])->assertStatus(201)->json('data');

        $litterId = $created['id'];

        $resp = $this->getJson("/api/litters/{$litterId}");
        $resp->assertStatus(200);
        $resp->assertJsonStructure(['data' => ['id', 'name', 'pet_type_id', 'created_by', 'pets']]);
        $resp->assertJsonPath('data.id', $litterId);
        $resp->assertJsonPath('data.name', 'Test Litter');
        $this->assertCount(2, $resp->json('data.pets'));
    }

    #[Test]
    public function get_is_refused_to_user_who_cannot_act_on_every_member(): void
    {
        $cat = $this->createPetType('Cat', 'cat', true, 0);
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $this->actingAs($owner);
        $litterId = $this->postJson('/api/litters', [
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'members' => [['sex' => 'female'], ['sex' => 'male']],
        ])->assertStatus(201)->json('data.id');

        $this->actingAs($other);
        $resp = $this->getJson("/api/litters/{$litterId}");
        $resp->assertStatus(403);
    }

    #[Test]
    public function token_client_can_create_two_litters_with_same_placeholders(): void
    {
        $cat = $this->createPetType('Cat', 'cat', true, 0);
        $user = User::factory()->create();
        $token = $user->createToken('test', ['pet:write'])->plainTextToken;

        $payload = [
            'pet_type_id' => $cat->id,
            'country' => 'VN',
            'members' => [['sex' => 'female'], ['sex' => 'male']],
        ];

        $first = $this->withToken($token)->postJson('/api/litters', $payload);
        $first->assertStatus(201);
        $this->assertContains('Kitten 1', collect($first->json('data.pets'))->pluck('name')->all());

        $second = $this->withToken($token)->postJson('/api/litters', $payload);
        $second->assertStatus(201);
        $this->assertContains('Kitten 1', collect($second->json('data.pets'))->pluck('name')->all());

        // both litters exist, total 4 pets
        $this->assertEquals(2, Litter::count());
        $this->assertEquals(4, Pet::whereNotNull('litter_id')->count());
    }

    #[Test]
    public function store_pet_duplicate_guard_still_works_for_single_pet_creation(): void
    {
        $cat = $this->createPetType('Cat', 'cat', true, 0);
        $user = User::factory()->create();
        $token = $user->createToken('test', ['pet:write'])->plainTextToken;

        $payload = [
            'name' => 'Fluffy',
            'country' => 'VN',
            'pet_type_id' => $cat->id,
        ];

        $first = $this->withToken($token)->postJson('/api/pets', $payload);
        $first->assertStatus(201);

        $second = $this->withToken($token)->postJson('/api/pets', $payload);
        $second->assertStatus(409);
        $second->assertJsonPath('error', 'duplicate_pet');
    }
}
