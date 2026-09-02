<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PetRelationshipType;
use App\Enums\PlacementQuestionStatus;
use App\Enums\PlacementRequestStatus;
use App\Jobs\SendPlacementQuestionAnsweredEmail;
use App\Jobs\SendPlacementQuestionConfirmationEmail;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\PetType;
use App\Models\PlacementQuestion;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Services\PetRelationshipService;
use Database\Seeders\PetTypeSeeder;
use GrantHolle\Altcha\Altcha;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PlacementQuestionTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Pet $pet;

    private PlacementRequest $listing;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PetTypeSeeder::class);

        $this->owner = User::factory()->create();
        $petType = PetType::factory()->create(['placement_requests_allowed' => true]);
        $this->pet = Pet::factory()->create([
            'created_by' => $this->owner->id,
            'pet_type_id' => $petType->id,
        ]);

        // Pet::factory() already opens the owner relationship for created_by.

        $this->listing = PlacementRequest::factory()->create([
            'pet_id' => $this->pet->id,
            'user_id' => $this->owner->id,
            'status' => PlacementRequestStatus::OPEN,
        ]);
    }

    /**
     * Drop the acting user. actingAs() persists for the rest of a test, so
     * without this a "the public sees X" assertion silently runs as the owner.
     */
    private function asGuest(): self
    {
        $this->app['auth']->forgetGuards();

        return $this;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function askPayload(array $overrides = []): array
    {
        return array_merge([
            'asker_name' => 'Linh',
            'question' => 'Is she good with other cats?',
            'altcha' => config('altcha.testing_bypass'),
        ], $overrides);
    }

    #[Test]
    public function an_anonymous_visitor_can_ask_a_question(): void
    {
        $response = $this->postJson("/api/placement-requests/{$this->listing->id}/questions", $this->askPayload());

        $response->assertStatus(201);

        $this->assertDatabaseHas('placement_questions', [
            'pet_id' => $this->pet->id,
            'placement_request_id' => $this->listing->id,
            'asker_name' => 'Linh',
            'status' => PlacementQuestionStatus::PENDING->value,
        ]);
    }

    #[Test]
    public function asking_requires_a_solved_altcha(): void
    {
        $this->postJson("/api/placement-requests/{$this->listing->id}/questions", $this->askPayload([
            'altcha' => 'not-a-solution',
        ]))->assertStatus(422)->assertJsonValidationErrors('altcha');

        $this->assertDatabaseCount('placement_questions', 0);
    }

    #[Test]
    public function a_solved_altcha_cannot_be_replayed(): void
    {
        // The bypass value is deliberately reusable, so this exercises the burn
        // with a real payload shape instead.
        config(['altcha.testing_bypass' => null]);
        // Keep the search space small so the test solves it deterministically
        // rather than brute-forcing up to the production maximum.
        config(['altcha.range_max' => 500]);

        $challenge = app(Altcha::class)->createChallenge();
        $solution = $this->solve($challenge);

        $this->postJson("/api/placement-requests/{$this->listing->id}/questions", $this->askPayload([
            'altcha' => $solution,
        ]))->assertStatus(201);

        $this->postJson("/api/placement-requests/{$this->listing->id}/questions", $this->askPayload([
            'question' => 'A second question riding the same proof of work.',
            'altcha' => $solution,
        ]))->assertStatus(422)->assertJsonValidationErrors('altcha');

        $this->assertDatabaseCount('placement_questions', 1);
    }

    #[Test]
    public function a_pending_question_is_invisible_to_the_public(): void
    {
        PlacementQuestion::factory()->create([
            'pet_id' => $this->pet->id,
            'placement_request_id' => $this->listing->id,
            'question' => 'Still waiting on an answer',
        ]);

        $this->getJson("/api/placement-requests/{$this->listing->id}/questions")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    #[Test]
    public function the_listing_side_sees_pending_questions(): void
    {
        PlacementQuestion::factory()->create([
            'pet_id' => $this->pet->id,
            'placement_request_id' => $this->listing->id,
            'question' => 'Still waiting on an answer',
        ]);

        $this->actingAs($this->owner)
            ->getJson("/api/placement-requests/{$this->listing->id}/questions")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['question' => 'Still waiting on an answer']);
    }

    #[Test]
    public function answering_publishes_the_pair(): void
    {
        $question = PlacementQuestion::factory()->create([
            'pet_id' => $this->pet->id,
            'placement_request_id' => $this->listing->id,
        ]);

        $this->actingAs($this->owner)
            ->postJson("/api/placement-questions/{$question->id}/answer", [
                'answer' => 'Yes, she shares with two others.',
            ])
            ->assertOk();

        $question->refresh();
        $this->assertSame(PlacementQuestionStatus::PUBLISHED, $question->status);
        $this->assertSame($this->owner->name, $question->answered_by_name);

        $this->asGuest()
            ->getJson("/api/placement-requests/{$this->listing->id}/questions")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['answer' => 'Yes, she shares with two others.']);
    }

    #[Test]
    public function an_editor_may_read_the_pet_but_never_answer_for_it(): void
    {
        $editor = User::factory()->create();
        PetRelationship::create([
            'user_id' => $editor->id,
            'pet_id' => $this->pet->id,
            'relationship_type' => PetRelationshipType::EDITOR,
            'start_at' => now()->subDay(),
            'created_by' => $this->owner->id,
        ]);

        $question = PlacementQuestion::factory()->create([
            'pet_id' => $this->pet->id,
            'placement_request_id' => $this->listing->id,
        ]);

        $this->actingAs($editor)
            ->postJson("/api/placement-questions/{$question->id}/answer", ['answer' => 'Sure!'])
            ->assertStatus(403);

        $this->actingAs($editor)
            ->postJson("/api/placement-questions/{$question->id}/hide")
            ->assertStatus(403);
    }

    #[Test]
    public function the_owner_cannot_edit_the_question_text(): void
    {
        $question = PlacementQuestion::factory()->create([
            'pet_id' => $this->pet->id,
            'placement_request_id' => $this->listing->id,
            'question' => 'Original wording',
        ]);

        // Answering accepts an answer and nothing else - there is deliberately
        // no route or field that rewrites someone else's question.
        $this->actingAs($this->owner)
            ->postJson("/api/placement-questions/{$question->id}/answer", [
                'answer' => 'An answer',
                'question' => 'Rewritten wording',
            ])
            ->assertOk();

        $this->assertSame('Original wording', $question->refresh()->question);
    }

    #[Test]
    public function hiding_and_unhiding_moves_a_question_in_and_out_of_public_view(): void
    {
        $question = PlacementQuestion::factory()
            ->answered($this->owner)
            ->create([
                'pet_id' => $this->pet->id,
                'placement_request_id' => $this->listing->id,
            ]);

        $this->actingAs($this->owner)->postJson("/api/placement-questions/{$question->id}/hide")->assertOk();
        $this->asGuest()->getJson("/api/placement-requests/{$this->listing->id}/questions")->assertJsonCount(0, 'data');

        $this->actingAs($this->owner)->postJson("/api/placement-questions/{$question->id}/unhide")->assertOk();
        $this->asGuest()->getJson("/api/placement-requests/{$this->listing->id}/questions")->assertJsonCount(1, 'data');

        $this->assertSame(PlacementQuestionStatus::PUBLISHED, $question->refresh()->status);
    }

    #[Test]
    public function an_unconfirmed_address_is_never_mailed_and_is_later_discarded(): void
    {
        Queue::fake();

        $question = PlacementQuestion::factory()
            ->withPendingEmail('asker@example.test')
            ->create([
                'pet_id' => $this->pet->id,
                'placement_request_id' => $this->listing->id,
            ]);

        $this->actingAs($this->owner)
            ->postJson("/api/placement-questions/{$question->id}/answer", ['answer' => 'Yes.'])
            ->assertOk();

        Queue::assertNotPushed(SendPlacementQuestionAnsweredEmail::class);

        $question->forceFill(['email_confirmation_expires_at' => now()->subDay()])->save();
        $this->artisan('placement-questions:prune-unconfirmed')->assertSuccessful();

        $this->assertNull($question->refresh()->asker_email);
    }

    #[Test]
    public function a_confirmed_address_receives_exactly_one_notification(): void
    {
        Queue::fake();

        $question = PlacementQuestion::factory()
            ->withConfirmedEmail('asker@example.test')
            ->create([
                'pet_id' => $this->pet->id,
                'placement_request_id' => $this->listing->id,
            ]);

        $this->actingAs($this->owner)
            ->postJson("/api/placement-questions/{$question->id}/answer", ['answer' => 'Yes.'])
            ->assertOk();

        // Editing the answer is a correction, not a new event for the asker.
        $this->actingAs($this->owner)
            ->postJson("/api/placement-questions/{$question->id}/answer", ['answer' => 'Yes, definitely.'])
            ->assertOk();

        Queue::assertPushed(SendPlacementQuestionAnsweredEmail::class, 1);
    }

    #[Test]
    public function confirming_an_address_unlocks_delivery_without_changing_visibility(): void
    {
        Queue::fake();

        $question = PlacementQuestion::factory()
            ->withPendingEmail('asker@example.test', 'raw-token')
            ->create([
                'pet_id' => $this->pet->id,
                'placement_request_id' => $this->listing->id,
            ]);

        $this->get("/placement-questions/{$question->id}/confirm?token=raw-token")
            ->assertRedirect();

        $question->refresh();
        $this->assertNotNull($question->asker_email_confirmed_at);
        // Confirming does not publish anything.
        $this->assertSame(PlacementQuestionStatus::PENDING, $question->status);
    }

    #[Test]
    public function a_bad_confirmation_token_is_rejected(): void
    {
        $question = PlacementQuestion::factory()
            ->withPendingEmail('asker@example.test', 'raw-token')
            ->create([
                'pet_id' => $this->pet->id,
                'placement_request_id' => $this->listing->id,
            ]);

        $this->get("/placement-questions/{$question->id}/confirm?token=wrong-token")
            ->assertRedirect();

        $this->assertNull($question->refresh()->asker_email_confirmed_at);
    }

    #[Test]
    public function the_asker_email_and_ip_are_never_exposed_through_the_api(): void
    {
        PlacementQuestion::factory()
            ->answered($this->owner)
            ->withConfirmedEmail('secret@example.test')
            ->create([
                'pet_id' => $this->pet->id,
                'placement_request_id' => $this->listing->id,
                'asker_ip' => '203.0.113.9',
            ]);

        foreach ([null, $this->owner] as $viewer) {
            $request = $viewer === null ? $this : $this->actingAs($viewer);
            $body = $request->getJson("/api/placement-requests/{$this->listing->id}/questions")
                ->assertOk()
                ->getContent();

            $this->assertStringNotContainsString('secret@example.test', (string) $body);
            $this->assertStringNotContainsString('203.0.113.9', (string) $body);
        }
    }

    #[Test]
    public function questions_follow_the_pet_across_relisting(): void
    {
        PlacementQuestion::factory()
            ->answered($this->owner)
            ->create([
                'pet_id' => $this->pet->id,
                'placement_request_id' => $this->listing->id,
                'question' => 'Carried over',
            ]);

        $relisted = PlacementRequest::factory()->create([
            'pet_id' => $this->pet->id,
            'user_id' => $this->owner->id,
            'status' => PlacementRequestStatus::OPEN,
        ]);

        $this->getJson("/api/placement-requests/{$relisted->id}/questions")
            ->assertOk()
            ->assertJsonFragment(['question' => 'Carried over']);
    }

    #[Test]
    public function ownership_transfer_keeps_answers_and_drops_the_previous_owners_name(): void
    {
        $question = PlacementQuestion::factory()
            ->answered($this->owner)
            ->create([
                'pet_id' => $this->pet->id,
                'placement_request_id' => $this->listing->id,
                'answer' => 'She is great with other cats.',
            ]);

        $newOwner = User::factory()->create();

        app(PetRelationshipService::class)->transferOwnership(
            $this->pet,
            $this->owner,
            $newOwner,
            $this->owner,
        );

        $question->refresh();
        $this->assertSame('She is great with other cats.', $question->answer);
        $this->assertNull($question->answered_by_name);
        $this->assertNull($question->answered_by_user_id);
    }

    #[Test]
    public function questions_are_refused_when_the_listing_is_not_open(): void
    {
        $this->listing->forceFill(['status' => PlacementRequestStatus::FULFILLED])->save();

        $this->postJson("/api/placement-requests/{$this->listing->id}/questions", $this->askPayload())
            ->assertStatus(422)
            ->assertJsonFragment(['code' => 'listing_not_open']);
    }

    #[Test]
    public function confirmation_email_is_queued_only_when_an_address_is_given(): void
    {
        Queue::fake();

        $this->postJson("/api/placement-requests/{$this->listing->id}/questions", $this->askPayload())
            ->assertStatus(201);
        Queue::assertNotPushed(SendPlacementQuestionConfirmationEmail::class);

        $this->postJson("/api/placement-requests/{$this->listing->id}/questions", $this->askPayload([
            'asker_email' => 'asker@example.test',
            'question' => 'A second, different question about the cat.',
        ]))->assertStatus(201);
        Queue::assertPushed(SendPlacementQuestionConfirmationEmail::class, 1);
    }

    /**
     * Solve a challenge the way the browser widget does, so the replay test
     * exercises the real verification path rather than the test bypass.
     *
     * @param  array<string, mixed>  $challenge
     */
    private function solve(array $challenge): string
    {
        $salt = (string) $challenge['salt'];
        $target = (string) $challenge['challenge'];

        $max = (int) config('altcha.range_max', 1000000);

        for ($number = 0; $number <= $max; $number++) {
            if (hash('sha256', $salt.$number) === $target) {
                return base64_encode((string) json_encode([
                    'algorithm' => $challenge['algorithm'],
                    'challenge' => $target,
                    'number' => $number,
                    'salt' => $salt,
                    'signature' => $challenge['signature'],
                ]));
            }
        }

        $this->fail('Could not solve the Altcha challenge.');
    }
}
