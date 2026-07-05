<?php

namespace Tests\Feature;

use App\Enums\HelperProfileApprovalStatus;
use App\Enums\HelperProfileStatus;
use App\Enums\PlacementRequestType;
use App\Jobs\TranslateContentField;
use App\Models\City;
use App\Models\ContentTranslation;
use App\Models\HelperProfile;
use App\Models\PetType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Queue;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PublicHelperProfileApiTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_lists_only_public_approved_helper_profiles()
    {
        $petType = PetType::factory()->create(['placement_requests_allowed' => true]);

        $publicProfile = HelperProfile::factory()->create([
            'approval_status' => HelperProfileApprovalStatus::APPROVED,
            'status' => HelperProfileStatus::PUBLIC,
            'request_types' => [PlacementRequestType::FOSTER_FREE->value],
            'country' => 'VN',
            'city' => 'Hanoi',
            'phone_number' => '+84999999999',
            'contact_details' => [
                ['type' => 'telegram', 'value' => 'publichelper'],
            ],
            'experience' => 'Experienced cat foster parent',
        ]);
        $publicProfile->petTypes()->sync([$petType->id]);

        HelperProfile::factory()->create([
            'approval_status' => HelperProfileApprovalStatus::APPROVED,
            'status' => HelperProfileStatus::PRIVATE,
        ]);

        HelperProfile::factory()->create([
            'approval_status' => HelperProfileApprovalStatus::PENDING,
            'status' => HelperProfileStatus::PUBLIC,
        ]);

        $response = $this->getJson('/api/helpers');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $publicProfile->id)
            ->assertJsonMissingPath('data.0.phone_number')
            ->assertJsonMissingPath('data.0.contact_details');
    }

    #[Test]
    public function it_filters_public_helper_profiles()
    {
        $catType = PetType::factory()->create(['placement_requests_allowed' => true, 'name' => 'Cat', 'slug' => 'cat']);
        $dogType = PetType::factory()->create(['placement_requests_allowed' => true, 'name' => 'Dog', 'slug' => 'dog']);
        $hanoi = City::factory()->create([
            'country' => 'VN',
            'name' => [
                'en' => 'Hanoi',
                'vi' => 'Ha Noi',
            ],
        ]);

        $matching = HelperProfile::factory()->create([
            'approval_status' => HelperProfileApprovalStatus::APPROVED,
            'status' => HelperProfileStatus::PUBLIC,
            'country' => 'VN',
            'city' => 'Da Nang',
            'experience' => 'Cat specialist in Hanoi',
            'request_types' => [PlacementRequestType::FOSTER_FREE->value],
        ]);
        $matching->petTypes()->sync([$catType->id]);
        $matching->cities()->sync([$hanoi->id]);

        $other = HelperProfile::factory()->create([
            'approval_status' => HelperProfileApprovalStatus::APPROVED,
            'status' => HelperProfileStatus::PUBLIC,
            'country' => 'US',
            'city' => 'Austin',
            'experience' => 'Dog helper',
            'request_types' => [PlacementRequestType::PERMANENT->value],
        ]);
        $other->petTypes()->sync([$dogType->id]);

        $response = $this->getJson('/api/helpers?country=VN&city=Hanoi&request_type=foster_free&pet_type_id='.$catType->id.'&search=cat');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matching->id)
            ->assertJsonMissingPath('data.1');
    }

    #[Test]
    public function it_shows_a_public_helper_profile()
    {
        $profile = HelperProfile::factory()->create([
            'approval_status' => HelperProfileApprovalStatus::APPROVED,
            'status' => HelperProfileStatus::PUBLIC,
            'phone_number' => '+84999999999',
            'contact_details' => [
                ['type' => 'telegram', 'value' => 'publichelper'],
            ],
        ]);

        $response = $this->getJson("/api/helpers/{$profile->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $profile->id)
            ->assertJsonMissingPath('data.phone_number')
            ->assertJsonMissingPath('data.contact_details');
    }

    #[Test]
    public function it_dispatches_translation_for_public_helper_profile_when_viewer_locale_differs()
    {
        Queue::fake();

        $profile = HelperProfile::factory()->create([
            'approval_status' => HelperProfileApprovalStatus::APPROVED,
            'status' => HelperProfileStatus::PUBLIC,
            'experience' => 'Experienced cat foster parent',
            'experience_locale' => 'en',
        ]);

        $response = $this->withHeader('Accept-Language', 'vi')->getJson("/api/helpers/{$profile->id}");

        $response->assertOk()
            ->assertJsonPath('data.experience_translation.status', 'pending')
            ->assertJsonPath('data.experience_translation.original', 'Experienced cat foster parent')
            ->assertJsonPath('data.experience_translation.original_locale', 'en')
            ->assertJsonPath('data.experience_translation.viewer_locale', 'vi');

        $this->assertDatabaseHas('content_translations', [
            'translatable_type' => $profile->getMorphClass(),
            'translatable_id' => $profile->id,
            'field' => 'experience',
            'status' => 'pending',
        ]);
        Queue::assertPushed(TranslateContentField::class);
    }

    #[Test]
    public function it_returns_cached_public_helper_profile_translation()
    {
        Queue::fake();

        $profile = HelperProfile::factory()->create([
            'approval_status' => HelperProfileApprovalStatus::APPROVED,
            'status' => HelperProfileStatus::PUBLIC,
            'experience' => 'Experienced cat foster parent',
            'experience_locale' => 'en',
        ]);

        ContentTranslation::create([
            'translatable_type' => $profile->getMorphClass(),
            'translatable_id' => $profile->id,
            'field' => 'experience',
            'source_locale' => 'en',
            'source_hash' => hash('sha256', 'Experienced cat foster parent'),
            'text' => ['vi' => 'Có kinh nghiệm chăm sóc mèo tạm thời'],
            'status' => ContentTranslation::STATUS_TRANSLATED,
            'translated_at' => now(),
        ]);

        $response = $this->withHeader('Accept-Language', 'vi')->getJson("/api/helpers/{$profile->id}");

        $response->assertOk()
            ->assertJsonPath('data.experience_translation.status', 'translated')
            ->assertJsonPath('data.experience_translation.translated', 'Có kinh nghiệm chăm sóc mèo tạm thời')
            ->assertJsonPath('data.experience_translation.is_translated', true);

        Queue::assertNotPushed(TranslateContentField::class);
    }

    #[Test]
    public function it_retries_failed_public_helper_profile_translation_requests()
    {
        Queue::fake();

        $profile = HelperProfile::factory()->create([
            'approval_status' => HelperProfileApprovalStatus::APPROVED,
            'status' => HelperProfileStatus::PUBLIC,
            'experience' => 'Experienced cat foster parent',
            'experience_locale' => 'en',
        ]);

        ContentTranslation::create([
            'translatable_type' => $profile->getMorphClass(),
            'translatable_id' => $profile->id,
            'field' => 'experience',
            'source_locale' => 'en',
            'source_hash' => hash('sha256', 'Experienced cat foster parent'),
            'text' => [],
            'status' => ContentTranslation::STATUS_FAILED,
            'error' => 'Temporary upstream error',
        ]);

        $response = $this->withHeader('Accept-Language', 'vi')->getJson("/api/helpers/{$profile->id}");

        $response->assertOk()
            ->assertJsonPath('data.experience_translation.status', 'pending')
            ->assertJsonPath('data.experience_translation.is_translated', false);

        $this->assertDatabaseHas('content_translations', [
            'translatable_type' => $profile->getMorphClass(),
            'translatable_id' => $profile->id,
            'field' => 'experience',
            'status' => 'pending',
            'error' => null,
        ]);
        Queue::assertPushed(TranslateContentField::class);
    }

    #[Test]
    public function it_stores_helper_profile_experience_locale_when_experience_changes()
    {
        App::setLocale('vi');

        $profile = HelperProfile::factory()->create([
            'experience' => 'Tôi có kinh nghiệm chăm mèo.',
        ]);

        $this->assertSame('vi', $profile->fresh()->experience_locale);
    }

    #[Test]
    public function it_hides_private_helper_profiles_from_public_show()
    {
        $profile = HelperProfile::factory()->create([
            'approval_status' => HelperProfileApprovalStatus::APPROVED,
            'status' => HelperProfileStatus::PRIVATE,
        ]);

        $response = $this->getJson("/api/helpers/{$profile->id}");

        $response->assertNotFound();
    }

    #[Test]
    public function archived_helper_profiles_restore_as_private()
    {
        $user = User::factory()->create();
        $profile = HelperProfile::factory()->for($user)->create([
            'status' => HelperProfileStatus::ARCHIVED,
        ]);

        $response = $this->actingAs($user)->postJson("/api/helper-profiles/{$profile->id}/restore");

        $response->assertOk()
            ->assertJsonPath('data.status', 'private');
    }
}
