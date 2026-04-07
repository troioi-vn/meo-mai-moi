<?php

namespace Tests\Feature;

use App\Enums\PlacementRequestType;
use App\Enums\PlacementResponseStatus;
use App\Models\City;
use App\Models\HelperProfile;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class HelperProfileApiTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function can_get_own_helper_profiles()
    {
        $user = User::factory()->create();
        // Create owned profiles
        HelperProfile::factory()->count(2)->for($user)->create(['approval_status' => 'approved']);
        HelperProfile::factory()->for($user)->create(['approval_status' => 'pending']);
        // Create other profiles not visible to user
        HelperProfile::factory()->count(2)->create(['approval_status' => 'approved']);

        $response = $this->actingAs($user)->getJson('/api/helper-profiles');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data'); // only own profiles
    }

    #[Test]
    public function owner_can_get_their_specific_helper_profile()
    {
        $user = User::factory()->create();
        $helperProfile = HelperProfile::factory()->for($user)->create(['approval_status' => 'approved']);

        $response = $this->actingAs($user)->getJson("/api/helper-profiles/{$helperProfile->id}");

        $response->assertStatus(200)
            ->assertJson(['data' => ['id' => $helperProfile->id]]);
    }

    #[Test]
    public function can_create_a_helper_profile()
    {
        $user = User::factory()->create();
        $city = City::factory()->create(['country' => 'VN']);
        $petType = PetType::factory()->create(['name' => 'Cat', 'slug' => 'cat', 'is_system' => true]);

        $data = [
            'country' => 'VN',
            'address' => '123 Test St',
            'city_ids' => [$city->id],
            'state' => 'TS',
            'phone_number' => '123-456-7890',
            'contact_details' => [
                ['type' => 'telegram', 'value' => '@testhelper'],
                ['type' => 'facebook', 'value' => 'https://www.facebook.com/test.helper'],
            ],
            'experience' => 'Lots of experience',
            'has_pets' => true,
            'has_children' => false,
            'request_types' => [PlacementRequestType::FOSTER_FREE->value, PlacementRequestType::PERMANENT->value],
            'zip_code' => '12345',
            'pet_type_ids' => [$petType->id],
        ];

        $response = $this->actingAs($user)->postJson('/api/helper-profiles', $data);

        $response->assertStatus(201)
            ->assertJsonPath('data.country', 'VN')
            ->assertJsonPath('data.request_types', $data['request_types'])
            ->assertJsonPath('data.status', 'private')
            ->assertJsonPath('data.contact_details.0.value', 'testhelper')
            ->assertJsonPath('data.contact_details.1.value', 'test.helper');

        $this->assertDatabaseHas('helper_profiles', [
            'country' => 'VN',
            'address' => '123 Test St',
            'city' => $city->name,
        ]);
    }

    #[Test]
    public function can_create_a_helper_profile_with_multiple_cities()
    {
        $user = User::factory()->create();
        $city1 = City::factory()->create(['country' => 'VN', 'name' => 'City 1']);
        $city2 = City::factory()->create(['country' => 'VN', 'name' => 'City 2']);
        $petType = PetType::factory()->create(['name' => 'Cat', 'slug' => 'cat', 'is_system' => true]);

        $data = [
            'country' => 'VN',
            'address' => '123 Test St',
            'city_ids' => [$city1->id, $city2->id],
            'state' => 'TS',
            'phone_number' => '123-456-7890',
            'contact_details' => [
                ['type' => 'other', 'value' => 'Reach me after 6pm'],
            ],
            'experience' => 'Experience',
            'has_pets' => true,
            'has_children' => false,
            'request_types' => [PlacementRequestType::FOSTER_FREE->value],
            'zip_code' => '12345',
            'pet_type_ids' => [$petType->id],
        ];

        $response = $this->actingAs($user)->postJson('/api/helper-profiles', $data);

        $response->assertStatus(201);

        $profileId = $response->json('data.id');
        $this->assertDatabaseHas('helper_profile_city', [
            'helper_profile_id' => $profileId,
            'city_id' => $city1->id,
        ]);
        $this->assertDatabaseHas('helper_profile_city', [
            'helper_profile_id' => $profileId,
            'city_id' => $city2->id,
        ]);

        // The 'city' field should contain both names
        $this->assertDatabaseHas('helper_profiles', [
            'id' => $profileId,
            'city' => 'City 1, City 2',
            'status' => 'private',
        ]);
    }

    #[Test]
    public function can_create_a_public_helper_profile()
    {
        $user = User::factory()->create();
        $city = City::factory()->create(['country' => 'VN']);

        $response = $this->actingAs($user)->postJson('/api/helper-profiles', [
            'country' => 'VN',
            'city_ids' => [$city->id],
            'phone_number' => '+84123456789',
            'experience' => 'Lots of experience',
            'has_pets' => true,
            'has_children' => false,
            'request_types' => [PlacementRequestType::FOSTER_FREE->value],
            'status' => 'public',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'public');
    }

    #[Test]
    public function can_update_a_helper_profile_with_multiple_cities()
    {
        $user = User::factory()->create();
        $city1 = City::factory()->create(['country' => 'VN', 'name' => 'City 1']);
        $city2 = City::factory()->create(['country' => 'VN', 'name' => 'City 2']);
        $profile = HelperProfile::factory()->for($user)->create([
            'country' => 'VN',
            'city_id' => $city1->id,
            'city' => $city1->name,
        ]);
        $profile->cities()->sync([$city1->id]);

        $data = [
            'city_ids' => [$city1->id, $city2->id],
        ];

        $response = $this->actingAs($user)->putJson("/api/helper-profiles/{$profile->id}", $data);

        $response->assertStatus(200);

        $this->assertDatabaseHas('helper_profile_city', [
            'helper_profile_id' => $profile->id,
            'city_id' => $city1->id,
        ]);
        $this->assertDatabaseHas('helper_profile_city', [
            'helper_profile_id' => $profile->id,
            'city_id' => $city2->id,
        ]);

        $this->assertDatabaseHas('helper_profiles', [
            'id' => $profile->id,
            'city' => 'City 1, City 2',
        ]);
    }

    #[Test]
    public function can_create_a_helper_profile_with_media_library_photos()
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $city = City::factory()->create(['country' => 'VN']);

        $response = $this->actingAs($user)->post('/api/helper-profiles', [
            'country' => 'VN',
            'city_ids' => [$city->id],
            'phone_number' => '123-456-7890',
            'experience' => 'Lots of experience',
            'has_pets' => true,
            'has_children' => false,
            'request_types' => [PlacementRequestType::FOSTER_FREE->value],
            'photos' => [
                UploadedFile::fake()->image('home-1.jpg'),
                UploadedFile::fake()->image('home-2.jpg'),
            ],
        ], ['Accept' => 'application/json']);

        $response->assertStatus(201)
            ->assertJsonCount(2, 'data.photos')
            ->assertJsonStructure([
                'data' => [
                    'photos' => [
                        '*' => ['id', 'url', 'thumb_url', 'is_primary'],
                    ],
                ],
            ]);

        $profile = HelperProfile::findOrFail($response->json('data.id'));

        $this->assertCount(2, $profile->getMedia('photos'));
    }

    #[Test]
    public function cannot_create_helper_profile_without_request_types()
    {
        $user = User::factory()->create();
        $city = City::factory()->create(['country' => 'VN']);
        $petType = PetType::factory()->create(['name' => 'Cat', 'slug' => 'cat', 'is_system' => true]);

        $data = [
            'country' => 'VN',
            'address' => '123 Test St',
            'city_ids' => [$city->id],
            'state' => 'TS',
            'phone_number' => '123-456-7890',
            'experience' => 'Lots of experience',
            'has_pets' => true,
            'has_children' => false,
            'request_types' => [],
            'zip_code' => '12345',
            'pet_type_ids' => [$petType->id],
        ];

        $response = $this->actingAs($user)->postJson('/api/helper-profiles', $data);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['request_types']);
    }

    #[Test]
    public function owner_can_delete_their_helper_profile()
    {
        $user = User::factory()->create();
        $profile = HelperProfile::factory()->for($user)->create();

        $response = $this->actingAs($user)->deleteJson("/api/helper-profiles/{$profile->id}");

        $response->assertStatus(204);
        // Helper profiles use soft deletes, so record still exists but is soft deleted
        $this->assertSoftDeleted('helper_profiles', ['id' => $profile->id]);
    }

    #[Test]
    public function owner_can_delete_a_helper_profile_photo_from_media_library()
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $profile = HelperProfile::factory()->for($user)->create();

        $media = $profile
            ->addMedia(UploadedFile::fake()->image('helper-photo.jpg'))
            ->toMediaCollection('photos');

        $response = $this->actingAs($user)->deleteJson("/api/helper-profiles/{$profile->id}/photos/{$media->id}");

        $response->assertStatus(204);

        $profile->refresh();

        $this->assertCount(0, $profile->getMedia('photos'));
    }

    #[Test]
    public function owner_can_set_main_helper_profile_photo()
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $profile = HelperProfile::factory()->for($user)->create();

        $profile->addMedia(UploadedFile::fake()->image('helper-photo-1.jpg'))->toMediaCollection('photos');
        $secondMedia = $profile->addMedia(UploadedFile::fake()->image('helper-photo-2.jpg'))->toMediaCollection('photos');

        $response = $this->actingAs($user)->postJson("/api/helper-profiles/{$profile->id}/photos/{$secondMedia->id}/set-primary");

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'photos' => [
                        '*' => ['id', 'url', 'thumb_url', 'is_primary'],
                    ],
                ],
            ]);

        $photos = $response->json('data.photos');

        $this->assertSame($secondMedia->id, $photos[0]['id']);
        $this->assertTrue($photos[0]['is_primary']);
        $this->assertFalse($photos[1]['is_primary']);
    }

    #[Test]
    public function non_owner_cannot_set_main_helper_profile_photo()
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $other = User::factory()->create();
        $profile = HelperProfile::factory()->for($owner)->create();
        $media = $profile->addMedia(UploadedFile::fake()->image('helper-photo.jpg'))->toMediaCollection('photos');

        $response = $this->actingAs($other)->postJson("/api/helper-profiles/{$profile->id}/photos/{$media->id}/set-primary");

        $response->assertForbidden();
    }

    #[Test]
    public function unauthenticated_delete_is_unauthorized()
    {
        $profile = HelperProfile::factory()->create();

        $response = $this->deleteJson("/api/helper-profiles/{$profile->id}");

        $response->assertStatus(401); // Sanctum guard should return 401
    }

    #[Test]
    public function non_owner_cannot_delete_helper_profile()
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $profile = HelperProfile::factory()->for($owner)->create();

        $response = $this->actingAs($other)->deleteJson("/api/helper-profiles/{$profile->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('helper_profiles', ['id' => $profile->id]);
    }

    #[Test]
    public function owner_can_view_their_own_helper_profile()
    {
        $owner = User::factory()->create();
        $profile = HelperProfile::factory()->for($owner)->create(['approval_status' => 'pending']);

        $response = $this->actingAs($owner)->getJson("/api/helper-profiles/{$profile->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $profile->id);
    }

    #[Test]
    public function pet_owner_can_view_helper_profile_if_helper_applied_to_their_placement_request()
    {
        $petOwner = User::factory()->create();
        $helperOwner = User::factory()->create();
        $profile = HelperProfile::factory()->for($helperOwner)->create(['approval_status' => 'pending']);

        // Create pet with placement request
        $pet = Pet::factory()->create(['created_by' => $petOwner->id]);
        $placementRequest = PlacementRequest::factory()->for($pet)->create([
            'request_type' => PlacementRequestType::FOSTER_FREE->value,
        ]);
        // Create placement response (helper applied to placement request)
        PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $profile->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        $response = $this->actingAs($petOwner)->getJson("/api/helper-profiles/{$profile->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $profile->id);
        $response->assertJsonStructure([
            'data' => [
                'placement_responses' => [
                    '*' => [
                        'placement_request' => [
                            'pet' => [
                                'pet_type' => [
                                    'id',
                                    'name',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ]);
    }

    #[Test]
    public function helper_profile_view_only_returns_latest_response_per_placement_request()
    {
        $petOwner = User::factory()->create();
        $helperOwner = User::factory()->create();
        $profile = HelperProfile::factory()->for($helperOwner)->create(['approval_status' => 'pending']);

        $pet = Pet::factory()->create(['created_by' => $petOwner->id]);
        $placementRequest = PlacementRequest::factory()->for($pet)->create([
            'request_type' => PlacementRequestType::FOSTER_FREE->value,
        ]);

        $old = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $profile->id,
            'status' => PlacementResponseStatus::CANCELLED,
        ]);

        $latest = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $profile->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        $response = $this->actingAs($petOwner)->getJson("/api/helper-profiles/{$profile->id}");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data.placement_responses');

        $ids = collect($response->json('data.placement_responses'))->pluck('id')->all();
        $this->assertContains($latest->id, $ids);
        $this->assertNotContains($old->id, $ids);
    }

    #[Test]
    public function user_cannot_view_pending_helper_profile_without_relationship()
    {
        $helperOwner = User::factory()->create();
        $randomUser = User::factory()->create();
        $profile = HelperProfile::factory()->for($helperOwner)->create(['approval_status' => 'pending']);

        $response = $this->actingAs($randomUser)->getJson("/api/helper-profiles/{$profile->id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function creates_helper_profile_validates_phone_number()
    {
        $user = User::factory()->create();
        $city = City::factory()->create(['country' => 'VN']);

        $data = [
            'country' => 'VN',
            'city_ids' => [$city->id],
            'phone_number' => 'invalid-phone-!!!',
            'experience' => 'Lots of experience',
            'has_pets' => true,
            'has_children' => false,
            'request_types' => [PlacementRequestType::FOSTER_FREE->value],
        ];

        $response = $this->actingAs($user)->postJson('/api/helper-profiles', $data);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone_number']);
    }

    #[Test]
    public function updates_helper_profile_validates_phone_number()
    {
        $user = User::factory()->create();
        $profile = HelperProfile::factory()->for($user)->create();

        $data = [
            'phone_number' => 'invalid-phone-!!!',
        ];

        $response = $this->actingAs($user)->putJson("/api/helper-profiles/{$profile->id}", $data);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone_number']);
    }

    #[Test]
    public function creates_helper_profile_validates_contact_detail_types_and_uniqueness()
    {
        $user = User::factory()->create();
        $city = City::factory()->create(['country' => 'VN']);

        $data = [
            'country' => 'VN',
            'city_ids' => [$city->id],
            'phone_number' => '+84123456789',
            'contact_details' => [
                ['type' => 'facebook', 'value' => 'https://instagram.com/not-facebook'],
                ['type' => 'facebook', 'value' => 'valid.profile'],
            ],
            'experience' => 'Lots of experience',
            'has_pets' => true,
            'has_children' => false,
            'request_types' => [PlacementRequestType::FOSTER_FREE->value],
        ];

        $response = $this->actingAs($user)->postJson('/api/helper-profiles', $data);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'contact_details.0.value',
                'contact_details.1.type',
            ]);
    }

    #[Test]
    public function creates_helper_profile_allows_multiple_other_contact_details()
    {
        $user = User::factory()->create();
        $city = City::factory()->create(['country' => 'VN']);

        $data = [
            'country' => 'VN',
            'city_ids' => [$city->id],
            'phone_number' => '+84123456789',
            'contact_details' => [
                ['type' => 'other', 'value' => 'Signal on request'],
                ['type' => 'other', 'value' => 'Calls after 18:00'],
            ],
            'experience' => 'Lots of experience',
            'has_pets' => true,
            'has_children' => false,
            'request_types' => [PlacementRequestType::FOSTER_FREE->value],
        ];

        $response = $this->actingAs($user)->postJson('/api/helper-profiles', $data);

        $response->assertCreated()
            ->assertJsonCount(2, 'data.contact_details');
    }
}
