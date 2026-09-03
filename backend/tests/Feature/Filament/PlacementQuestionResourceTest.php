<?php

declare(strict_types=1);

namespace Tests\Feature\Filament;

use App\Enums\PlacementQuestionStatus;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Filament\Resources\PlacementQuestionResource;
use App\Filament\Resources\PlacementQuestionResource\Pages\ListPlacementQuestions;
use App\Filament\Resources\PlacementQuestionResource\Pages\ViewPlacementQuestion;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\PlacementQuestion;
use App\Models\PlacementRequest;
use App\Models\User;
use Database\Seeders\PetTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class PlacementQuestionResourceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Pet $pet;

    private PlacementRequest $listing;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PetTypeSeeder::class);

        $this->admin = User::factory()->create();
        $owner = User::factory()->create();
        $petType = PetType::factory()->create(['placement_requests_allowed' => true]);
        $this->pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'pet_type_id' => $petType->id,
        ]);
        $this->listing = PlacementRequest::factory()->create([
            'pet_id' => $this->pet->id,
            'user_id' => $owner->id,
            'request_type' => PlacementRequestType::PERMANENT,
            'status' => PlacementRequestStatus::OPEN,
        ]);

        $this->actingAs($this->admin);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeQuestion(array $overrides = []): PlacementQuestion
    {
        return PlacementQuestion::factory()->create(array_merge([
            'pet_id' => $this->pet->id,
            'placement_request_id' => $this->listing->id,
            'asker_name' => 'Linh',
            'asker_email' => 'asker@example.test',
            'asker_email_confirmed_at' => now(),
            'asker_ip' => '203.0.113.7',
            'question' => 'Is she good with other cats?',
        ], $overrides));
    }

    public function test_approve_publishes_pending_question_via_table_action(): void
    {
        $question = $this->makeQuestion();

        Livewire::test(ListPlacementQuestions::class)
            ->assertSuccessful()
            ->callTableAction('approve', $question->getKey());

        $question->refresh();

        $this->assertSame(PlacementQuestionStatus::PUBLISHED, $question->status);
        $this->assertNotNull($question->published_at);
        $this->assertNull($question->hidden_at);

        // Moderation publishes; it never rewrites who asked or what was asked.
        $this->assertSame('Linh', $question->asker_name);
        $this->assertSame('asker@example.test', $question->asker_email);
        $this->assertSame('203.0.113.7', $question->asker_ip);
        $this->assertSame('Is she good with other cats?', $question->question);
        $this->assertNull($question->answer);
        $this->assertDatabaseHas('placement_questions', [
            'id' => $question->id,
            'status' => PlacementQuestionStatus::PUBLISHED->value,
            'asker_name' => 'Linh',
            'asker_email' => 'asker@example.test',
        ]);
    }

    public function test_moderation_action_visibility_follows_status_rules(): void
    {
        $pending = $this->makeQuestion();
        $published = $this->makeQuestion([
            'status' => PlacementQuestionStatus::PUBLISHED,
            'published_at' => now(),
        ]);
        $hidden = $this->makeQuestion([
            'status' => PlacementQuestionStatus::HIDDEN,
            'published_at' => now(),
            'hidden_at' => now(),
        ]);

        Livewire::test(ListPlacementQuestions::class)
            ->assertTableActionVisible('approve', $pending->getKey())
            ->assertTableActionVisible('hide', $pending->getKey())
            ->assertTableActionHidden('unhide', $pending->getKey())
            ->assertTableActionHidden('approve', $published->getKey())
            ->assertTableActionVisible('hide', $published->getKey())
            ->assertTableActionHidden('unhide', $published->getKey())
            ->assertTableActionHidden('approve', $hidden->getKey())
            ->assertTableActionHidden('hide', $hidden->getKey())
            ->assertTableActionVisible('unhide', $hidden->getKey());
    }

    public function test_hide_withdraws_pending_and_published_questions_but_keeps_content(): void
    {
        $pending = $this->makeQuestion();
        $answerer = User::factory()->create();
        $published = $this->makeQuestion([
            'status' => PlacementQuestionStatus::PUBLISHED,
            'published_at' => now(),
            'answer' => 'She loves other cats.',
            'answer_locale' => 'en',
            'answered_by_user_id' => $answerer->id,
            'answered_by_name' => $answerer->name,
            'answered_at' => now(),
        ]);

        Livewire::test(ListPlacementQuestions::class)
            ->callTableAction('hide', $pending->getKey());

        $this->assertSame(PlacementQuestionStatus::HIDDEN, $pending->refresh()->status);
        $this->assertNotNull($pending->hidden_at);

        Livewire::test(ListPlacementQuestions::class)
            ->callTableAction('hide', $published->getKey());

        $published->refresh();

        $this->assertSame(PlacementQuestionStatus::HIDDEN, $published->status);
        $this->assertNotNull($published->hidden_at);
        // Hiding withdraws from view; the answer and the asker stay intact.
        $this->assertSame('She loves other cats.', $published->answer);
        $this->assertSame($answerer->id, $published->answered_by_user_id);
        $this->assertSame($answerer->name, $published->answered_by_name);
        $this->assertSame('Linh', $published->asker_name);
        $this->assertSame('asker@example.test', $published->asker_email);
        $this->assertSame('Is she good with other cats?', $published->question);
    }

    public function test_unhide_restores_previously_published_question(): void
    {
        $answerer = User::factory()->create();
        $question = $this->makeQuestion([
            'status' => PlacementQuestionStatus::HIDDEN,
            'published_at' => now()->subDay(),
            'hidden_at' => now(),
            'answer' => 'She loves other cats.',
            'answer_locale' => 'en',
            'answered_by_user_id' => $answerer->id,
            'answered_by_name' => $answerer->name,
            'answered_at' => now()->subDay(),
        ]);

        Livewire::test(ListPlacementQuestions::class)
            ->callTableAction('unhide', $question->getKey());

        $question->refresh();

        $this->assertSame(PlacementQuestionStatus::PUBLISHED, $question->status);
        $this->assertNull($question->hidden_at);
        $this->assertNotNull($question->published_at);
        $this->assertSame('She loves other cats.', $question->answer);
        $this->assertSame($answerer->id, $question->answered_by_user_id);
        $this->assertSame('Linh', $question->asker_name);
        $this->assertSame('asker@example.test', $question->asker_email);
        $this->assertSame('203.0.113.7', $question->asker_ip);
    }

    public function test_unhide_returns_never_published_question_to_pending(): void
    {
        $question = $this->makeQuestion([
            'status' => PlacementQuestionStatus::HIDDEN,
            'published_at' => null,
            'hidden_at' => now(),
        ]);

        Livewire::test(ListPlacementQuestions::class)
            ->callTableAction('unhide', $question->getKey());

        $question->refresh();

        $this->assertSame(PlacementQuestionStatus::PENDING, $question->status);
        $this->assertNull($question->hidden_at);
        $this->assertNull($question->published_at);
        $this->assertSame('Linh', $question->asker_name);
        $this->assertSame('asker@example.test', $question->asker_email);
        $this->assertSame('Is she good with other cats?', $question->question);
    }

    public function test_pending_and_hidden_tabs_filter_moderation_queues(): void
    {
        $pending = $this->makeQuestion();
        $published = $this->makeQuestion([
            'status' => PlacementQuestionStatus::PUBLISHED,
            'published_at' => now(),
        ]);
        $hidden = $this->makeQuestion([
            'status' => PlacementQuestionStatus::HIDDEN,
            'hidden_at' => now(),
        ]);

        Livewire::test(ListPlacementQuestions::class)
            ->assertTableFilterExists('status')
            ->set('activeTab', 'pending')
            ->assertCanSeeTableRecords([$pending])
            ->assertCanNotSeeTableRecords([$published, $hidden])
            ->set('activeTab', 'hidden')
            ->assertCanSeeTableRecords([$hidden])
            ->assertCanNotSeeTableRecords([$pending, $published]);
    }

    public function test_view_page_header_actions_moderate_without_editing(): void
    {
        $question = $this->makeQuestion();

        Livewire::test(ViewPlacementQuestion::class, ['record' => $question->getRouteKey()])
            ->assertSuccessful()
            ->assertActionVisible('approve')
            ->assertActionVisible('hide')
            ->assertActionHidden('unhide')
            ->callAction('hide');

        $this->assertSame(PlacementQuestionStatus::HIDDEN, $question->refresh()->status);
        $this->assertSame('Is she good with other cats?', $question->question);
        $this->assertSame('asker@example.test', $question->asker_email);
    }

    public function test_resource_does_not_offer_create_or_edit_pages(): void
    {
        $this->assertFalse(PlacementQuestionResource::canCreate());

        $pages = PlacementQuestionResource::getPages();

        $this->assertArrayHasKey('index', $pages);
        $this->assertArrayHasKey('view', $pages);
        $this->assertArrayNotHasKey('create', $pages);
        $this->assertArrayNotHasKey('edit', $pages);
    }
}
