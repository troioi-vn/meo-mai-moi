<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\HelperProfileApprovalStatus;
use App\Enums\HelperProfileStatus;
use App\Enums\PetStatus;
use App\Enums\PlacementQuestionStatus;
use App\Enums\PlacementRequestStatus;
use App\Models\HelperProfile;
use App\Models\Pet;
use App\Models\PlacementQuestion;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Head metadata for the public pages other than /requests/{id}, which has its
 * own test. Every one of these used to serve the same hardcoded "Meo Mai Moi"
 * title, which is what a search result showed.
 */
class PublicShellMetaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // The shells hand off to the frontend when its host differs from the
        // request host; test requests use "localhost", so match it.
        config(['app.frontend_url' => 'http://localhost']);
    }

    #[Test]
    public function the_landing_page_describes_the_app_and_declares_an_organization(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('<title>Meo Mai Moi: rescue, rehoming and everyday pet care</title>', false)
            ->assertSee('<link rel="canonical" href="http://localhost">', false)
            ->assertSee('"@type":"Organization"', false);
    }

    #[Test]
    public function the_placement_index_has_its_own_title(): void
    {
        $this->get('/requests')
            ->assertOk()
            ->assertSee('<title>Pets looking for a home</title>', false)
            ->assertSee('<link rel="canonical" href="http://localhost/requests">', false);
    }

    #[Test]
    public function the_helper_index_has_its_own_title(): void
    {
        $this->get('/helpers')
            ->assertOk()
            ->assertSee('<title>People offering to help</title>', false);
    }

    #[Test]
    public function og_locale_follows_the_negotiated_language(): void
    {
        $this->withHeader('Accept-Language', 'vi')
            ->get('/')
            ->assertOk()
            ->assertSee('<meta property="og:locale" content="vi_VN">', false)
            ->assertSee('<html lang="vi">', false);
    }

    #[Test]
    public function a_published_helper_profile_names_its_location(): void
    {
        $profile = HelperProfile::factory()->create([
            'status' => HelperProfileStatus::PUBLIC,
            'approval_status' => HelperProfileApprovalStatus::APPROVED,
            'city' => 'Hanoi',
            'country' => 'VN',
            'experience' => 'Fostered eleven kittens over two years.',
        ]);

        $this->get("/helpers/{$profile->id}")
            ->assertOk()
            ->assertSee('Someone in Hanoi, VN offering to help', false)
            ->assertSee('Fostered eleven kittens over two years.', false);
    }

    #[Test]
    public function a_private_helper_profile_falls_back_to_the_plain_shell(): void
    {
        $profile = HelperProfile::factory()->create([
            'status' => HelperProfileStatus::PRIVATE,
            'approval_status' => HelperProfileApprovalStatus::APPROVED,
            'city' => 'Hanoi',
            'experience' => 'Fostered eleven kittens over two years.',
        ]);

        $this->get("/helpers/{$profile->id}")
            ->assertOk()
            ->assertSee('<title>Meo Mai Moi</title>', false)
            ->assertDontSee('Fostered eleven kittens', false);
    }

    #[Test]
    public function a_missing_helper_profile_still_renders_the_shell(): void
    {
        $this->get('/helpers/999999')
            ->assertOk()
            ->assertSee('<title>Meo Mai Moi</title>', false);
    }

    #[Test]
    public function a_publicly_viewable_pet_names_itself(): void
    {
        $pet = $this->petWithOpenListing();

        $this->get("/pets/{$pet->id}/view")
            ->assertOk()
            ->assertSee('Minnie', false)
            ->assertSee('og:type', false);
    }

    #[Test]
    public function a_pet_without_an_open_listing_gets_no_preview(): void
    {
        $owner = User::factory()->create();
        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'status' => PetStatus::ACTIVE,
            'name' => 'Nyusha',
        ]);

        $this->get("/pets/{$pet->id}/view")
            ->assertOk()
            ->assertSee('<title>Meo Mai Moi</title>', false)
            ->assertDontSee('Nyusha', false);
    }

    #[Test]
    public function published_questions_become_faq_structured_data(): void
    {
        $pet = $this->petWithOpenListing();
        $placementRequest = $pet->placementRequests->first();

        PlacementQuestion::factory()->create([
            'pet_id' => $pet->id,
            'placement_request_id' => $placementRequest->id,
            'question' => 'Is she good with other cats?',
            'answer' => 'Yes, she shares a room with two males.',
            'status' => PlacementQuestionStatus::PUBLISHED,
            'published_at' => now(),
        ]);

        $this->get("/requests/{$placementRequest->id}")
            ->assertOk()
            ->assertSee('"@type":"FAQPage"', false)
            ->assertSee('Is she good with other cats?', false)
            ->assertSee('Yes, she shares a room with two males.', false);
    }

    #[Test]
    public function a_pending_question_stays_out_of_the_structured_data(): void
    {
        $pet = $this->petWithOpenListing();
        $placementRequest = $pet->placementRequests->first();

        PlacementQuestion::factory()->create([
            'pet_id' => $pet->id,
            'placement_request_id' => $placementRequest->id,
            'question' => 'What is the owner home address?',
            'answer' => null,
            'status' => PlacementQuestionStatus::PENDING,
        ]);

        $this->get("/requests/{$placementRequest->id}")
            ->assertOk()
            ->assertDontSee('FAQPage', false)
            ->assertDontSee('What is the owner home address?', false);
    }

    private function petWithOpenListing(): Pet
    {
        $owner = User::factory()->create();
        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'status' => PetStatus::ACTIVE,
            'name' => 'Minnie',
            'city' => 'Hanoi',
            'country' => 'VN',
        ]);

        PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN,
        ]);

        return $pet->load('placementRequests');
    }
}
