<?php

namespace Tests\Feature;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementResponseStatus;
use App\Models\HelperProfile;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PetProfilePrivacyTest extends TestCase
{
    use RefreshDatabase;

    private const LEAKY_USER_KEYS = ['email', 'telegram_username', 'telegram_chat_id', 'google_id'];

    private const LEAKY_PROFILE_KEYS = ['phone_number', 'contact_details', 'address', 'zip_code'];

    /**
     * Build a publicly-viewable pet (OPEN placement request) with one
     * response whose helper user/profile carry known PII values.
     *
     * @return array{pet: Pet, owner: User, request: PlacementRequest, helperUser: User, helperProfile: HelperProfile}
     */
    private function createPublicPetWithApplicant(): array
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $request = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN,
        ]);

        $helperUser = User::factory()->create([
            'name' => 'Applicant Alice',
            'email' => 'alice.applicant@example.com',
            'telegram_username' => 'alice_applicant',
            'telegram_chat_id' => '987654321',
            'google_id' => 'google-alice-123',
        ]);
        $helperProfile = HelperProfile::factory()->create([
            'user_id' => $helperUser->id,
            'phone_number' => '+1-555-0100',
            'contact_details' => [['type' => 'telegram', 'value' => 'alice_applicant']],
            'address' => '123 Secret Street',
            'zip_code' => '90210',
        ]);
        PlacementRequestResponse::factory()->create([
            'placement_request_id' => $request->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        return [
            'pet' => $pet,
            'owner' => $owner,
            'request' => $request,
            'helperUser' => $helperUser,
            'helperProfile' => $helperProfile,
        ];
    }

    /**
     * Collect every non-null value stored under the given keys anywhere in a
     * nested array payload.
     *
     * @param  array<mixed>  $data
     * @param  list<string>  $keys
     * @return array<string, list<mixed>>
     */
    private function collectKeyValues(array $data, array $keys): array
    {
        $found = [];
        $walk = function ($node) use (&$walk, &$found, $keys): void {
            if (! is_array($node)) {
                return;
            }
            foreach ($node as $key => $value) {
                if (in_array($key, $keys, true) && $value !== null && $value !== [] && $value !== '') {
                    $found[$key][] = $value;
                }
                $walk($value);
            }
        };
        $walk($data);

        return $found;
    }

    #[Test]
    public function test_anonymous_show_hides_applicant_pii(): void
    {
        $fixture = $this->createPublicPetWithApplicant();

        $response = $this->getJson("/api/pets/{$fixture['pet']->id}");

        $response->assertStatus(200);

        $responses = $response->json('data.placement_requests.0.responses');
        $this->assertCount(1, $responses);

        $helperProfile = $responses[0]['helper_profile'];
        // Contact fields are nulled but keys stay for client shape stability.
        foreach (self::LEAKY_PROFILE_KEYS as $key) {
            $this->assertNull($helperProfile[$key] ?? null, "helper_profile.{$key} must be redacted");
        }

        // Nested user is at most {id, name}; the responder name is nulled for non-creators.
        $this->assertSame(
            ['id', 'name'],
            array_keys($helperProfile['user']),
            'anonymous viewer must see at most {id, name} for a nested user'
        );
        $this->assertSame($fixture['helperUser']->id, $helperProfile['user']['id']);
        $this->assertNull($helperProfile['user']['name']);

        // No leaky user value may appear anywhere in the applicant subtree.
        $this->assertSame(
            [],
            $this->collectKeyValues($responses, self::LEAKY_USER_KEYS),
            'applicant user PII must not leak to anonymous callers'
        );

        // Relationships are still all present and countable; member users are redacted too.
        $relationships = $response->json('data.relationships');
        $this->assertNotEmpty($relationships);
        $this->assertSame(
            [],
            $this->collectKeyValues($relationships, self::LEAKY_USER_KEYS),
            'member user PII must not leak to anonymous callers'
        );
        foreach ($relationships as $relationship) {
            $this->assertSame(['id', 'name'], array_keys($relationship['user']));
        }
    }

    #[Test]
    public function test_anonymous_view_endpoint_hides_applicant_pii(): void
    {
        $fixture = $this->createPublicPetWithApplicant();

        $response = $this->getJson("/api/pets/{$fixture['pet']->id}/view");

        $response->assertStatus(200);

        $responses = $response->json('data.placement_requests.0.responses');
        $this->assertCount(1, $responses);

        $helperProfile = $responses[0]['helper_profile'];
        foreach (self::LEAKY_PROFILE_KEYS as $key) {
            $this->assertNull($helperProfile[$key] ?? null, "helper_profile.{$key} must be redacted");
        }

        $this->assertSame(['id', 'name'], array_keys($helperProfile['user']));
        $this->assertNull($helperProfile['user']['name']);

        $this->assertSame(
            [],
            $this->collectKeyValues($responses, self::LEAKY_USER_KEYS),
            'applicant user PII must not leak to anonymous callers'
        );
    }

    #[Test]
    public function test_unrelated_authenticated_viewer_sees_no_applicant_pii(): void
    {
        $fixture = $this->createPublicPetWithApplicant();
        Sanctum::actingAs(User::factory()->create());

        foreach (["/api/pets/{$fixture['pet']->id}", "/api/pets/{$fixture['pet']->id}/view"] as $url) {
            $response = $this->getJson($url);
            $response->assertStatus(200);

            $responses = $response->json('data.placement_requests.0.responses');
            $this->assertCount(1, $responses);
            $this->assertNull($responses[0]['helper_profile']['user']['name']);
            $this->assertSame(
                [],
                $this->collectKeyValues($responses, [...self::LEAKY_USER_KEYS, ...self::LEAKY_PROFILE_KEYS]),
                "applicant PII must not leak to unrelated viewers via {$url}"
            );
        }
    }

    #[Test]
    public function test_owner_still_sees_full_applicant_contact_details(): void
    {
        $fixture = $this->createPublicPetWithApplicant();
        Sanctum::actingAs($fixture['owner']);

        foreach (["/api/pets/{$fixture['pet']->id}", "/api/pets/{$fixture['pet']->id}/view"] as $url) {
            $response = $this->getJson($url);
            $response->assertStatus(200);

            $helperProfile = $response->json('data.placement_requests.0.responses.0.helper_profile');

            // Every contact field the owner surface carries today must still be present.
            $this->assertSame('+1-555-0100', $helperProfile['phone_number']);
            $this->assertSame(
                [['type' => 'telegram', 'value' => 'alice_applicant']],
                $helperProfile['contact_details']
            );
            $this->assertSame('123 Secret Street', $helperProfile['address']);
            $this->assertSame('90210', $helperProfile['zip_code']);

            // Responder identity is fully visible to the owner.
            $this->assertSame('Applicant Alice', $helperProfile['user']['name']);
            $this->assertSame('alice.applicant@example.com', $helperProfile['user']['email']);
            $this->assertSame('alice_applicant', $helperProfile['user']['telegram_username']);
            $this->assertSame('987654321', $helperProfile['user']['telegram_chat_id']);
            $this->assertSame('google-alice-123', $helperProfile['user']['google_id']);
        }
    }

    #[Test]
    public function test_request_creator_sees_responder_name_but_stranger_does_not(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        // A group-style split: the request creator is not the pet owner.
        $creator = User::factory()->create();
        $request = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $creator->id,
            'status' => PlacementRequestStatus::OPEN,
        ]);

        $helperUser = User::factory()->create(['name' => 'Applicant Bob']);
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helperUser->id]);
        PlacementRequestResponse::factory()->create([
            'placement_request_id' => $request->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        Sanctum::actingAs($creator);
        $response = $this->getJson("/api/pets/{$pet->id}/view");
        $response->assertStatus(200)
            ->assertJsonPath(
                'data.placement_requests.0.responses.0.helper_profile.user.name',
                'Applicant Bob'
            );

        Sanctum::actingAs(User::factory()->create());
        $response = $this->getJson("/api/pets/{$pet->id}/view");
        $response->assertStatus(200);
        $this->assertNull($response->json('data.placement_requests.0.responses.0.helper_profile.user.name'));
    }
}
