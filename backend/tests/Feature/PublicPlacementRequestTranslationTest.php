<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Jobs\TranslateContentField;
use App\Models\ContentTranslation;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PublicPlacementRequestTranslationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_dispatches_translation_for_public_placement_request_when_viewer_locale_differs(): void
    {
        Queue::fake();

        $owner = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id]);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'request_type' => PlacementRequestType::PERMANENT,
            'status' => PlacementRequestStatus::OPEN,
            'notes' => 'Looking for a loving home.',
            'notes_locale' => 'en',
        ]);

        $response = $this->withHeader('Accept-Language', 'vi')->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.notes_translation.status', 'pending')
            ->assertJsonPath('data.notes_translation.original', 'Looking for a loving home.')
            ->assertJsonPath('data.notes_translation.original_locale', 'en')
            ->assertJsonPath('data.notes_translation.viewer_locale', 'vi');

        $this->assertDatabaseHas('content_translations', [
            'translatable_type' => $placementRequest->getMorphClass(),
            'translatable_id' => $placementRequest->id,
            'field' => 'notes',
            'status' => 'pending',
        ]);
        Queue::assertPushed(TranslateContentField::class);
    }

    public function test_it_returns_cached_public_placement_request_translation(): void
    {
        Queue::fake();

        $owner = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id]);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'request_type' => PlacementRequestType::PERMANENT,
            'status' => PlacementRequestStatus::OPEN,
            'notes' => 'Looking for a loving home.',
            'notes_locale' => 'en',
        ]);

        ContentTranslation::create([
            'translatable_type' => $placementRequest->getMorphClass(),
            'translatable_id' => $placementRequest->id,
            'field' => 'notes',
            'source_locale' => 'en',
            'source_hash' => hash('sha256', 'Looking for a loving home.'),
            'text' => ['vi' => 'Đang tìm một mái ấm yêu thương.'],
            'status' => ContentTranslation::STATUS_TRANSLATED,
            'translated_at' => now(),
        ]);

        $response = $this->withHeader('Accept-Language', 'vi')->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.notes_translation.status', 'translated')
            ->assertJsonPath('data.notes_translation.translated', 'Đang tìm một mái ấm yêu thương.')
            ->assertJsonPath('data.notes_translation.is_translated', true);

        Queue::assertNotPushed(TranslateContentField::class);
    }

    public function test_it_stores_placement_request_notes_locale_when_notes_change(): void
    {
        App::setLocale('vi');

        $placementRequest = PlacementRequest::factory()->create([
            'notes' => 'Một bé mèo cần tìm nhà mới.',
        ]);

        $this->assertSame('vi', $placementRequest->fresh()->notes_locale);
    }
}
