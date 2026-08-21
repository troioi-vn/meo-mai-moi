<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PetStatus;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Link previews for /requests/{id}.
 *
 * This is the page owners actually share, so a blank preview card costs real
 * adoptions. Note the route deliberately does not short-circuit under the
 * testing environment the way the catch-all does, or none of this would assert
 * anything.
 */
class PlacementRequestShellMetaTest extends TestCase
{
    use RefreshDatabase;

    private function openRequest(PlacementRequestType $type = PlacementRequestType::PERMANENT): PlacementRequest
    {
        $owner = User::factory()->create();
        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'status' => PetStatus::ACTIVE,
            'name' => 'Minnie',
        ]);

        return PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN,
            'request_type' => $type,
            'notes' => "Minnie is a sweet, playful cat.\n\nShe gets along with male cats.",
        ]);
    }

    #[Test]
    public function an_open_request_names_the_pet_in_its_preview(): void
    {
        $placementRequest = $this->openRequest();

        $this->get("/requests/{$placementRequest->id}")
            ->assertOk()
            ->assertSee('og:title', false)
            ->assertSee('Minnie needs a home', false)
            ->assertSee('og:type', false);
    }

    #[Test]
    public function the_description_flattens_the_owners_notes(): void
    {
        $placementRequest = $this->openRequest();

        // Newlines in an attribute break some crawlers' parsing.
        $this->get("/requests/{$placementRequest->id}")
            ->assertOk()
            ->assertSee('Minnie is a sweet, playful cat. She gets along with male cats.', false);
    }

    #[Test]
    public function foster_requests_get_their_own_wording(): void
    {
        $placementRequest = $this->openRequest(PlacementRequestType::FOSTER_FREE);

        $this->get("/requests/{$placementRequest->id}")
            ->assertOk()
            ->assertSee('Minnie needs a foster home', false);
    }

    #[Test]
    public function a_closed_request_falls_back_to_the_plain_shell(): void
    {
        // A finalized request must not keep advertising the pet to every crawler
        // that ever saw the link.
        $placementRequest = $this->openRequest();
        $placementRequest->update(['status' => PlacementRequestStatus::FINALIZED]);

        $this->get("/requests/{$placementRequest->id}")
            ->assertOk()
            ->assertDontSee('Minnie', false);
    }

    #[Test]
    public function a_missing_request_falls_back_to_the_plain_shell(): void
    {
        $this->get('/requests/999999')
            ->assertOk()
            ->assertSee('Meo Mai Moi', false);
    }

    #[Test]
    public function a_pet_name_cannot_break_out_of_the_meta_attribute(): void
    {
        $owner = User::factory()->create();
        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'status' => PetStatus::ACTIVE,
            'name' => '" onerror="alert(1)',
        ]);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN,
            'request_type' => PlacementRequestType::PERMANENT,
        ]);

        $this->get("/requests/{$placementRequest->id}")
            ->assertOk()
            ->assertDontSee('" onerror="alert(1)', false)
            ->assertSee('&quot; onerror=&quot;alert(1)', false);
    }
}
