<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PlacementRequestShellLocaleTest extends TestCase
{
    private PlacementRequest $placementRequest;

    protected function setUp(): void
    {
        parent::setUp();

        // The shell redirects to the frontend host when it differs from the
        // request host; test requests use host "localhost", so match it.
        config(['app.frontend_url' => 'http://localhost']);

        $owner = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'name' => 'Barsik']);
        $this->placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'request_type' => PlacementRequestType::PERMANENT,
            'status' => PlacementRequestStatus::OPEN,
        ]);
    }

    #[Test]
    public function guest_shell_honours_accept_language_for_html_lang_and_og_tags(): void
    {
        $response = $this->withHeader('Accept-Language', 'uk')
            ->get("/requests/{$this->placementRequest->id}");

        $response->assertStatus(200);
        $response->assertSee('<html lang="uk">', false);
        $response->assertSee('Barsik шукає дім', false);
    }

    #[Test]
    public function guest_shell_defaults_to_english_without_accept_language(): void
    {
        $response = $this->get("/requests/{$this->placementRequest->id}");

        $response->assertStatus(200);
        $response->assertSee('<html lang="en">', false);
        $response->assertSee('Barsik needs a home', false);
    }
}
