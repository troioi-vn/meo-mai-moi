<?php

namespace Tests\Feature;

use App\Models\Review;
use App\Models\User;
use App\Models\TransferRequest;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\CreatesUsers;

class ReviewResourceTest extends TestCase
{
    use RefreshDatabase, CreatesUsers;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create an admin user for testing
        $this->adminUser = User::factory()->create(['role' => UserRole::ADMIN->value]);
    }

    public function test_review_resource_exists(): void
    {
        $this->assertTrue(class_exists(\App\Filament\Resources\ReviewResource::class));
    }

    public function test_review_model_has_moderation_fields(): void
    {
        $reviewer = User::factory()->create(['name' => 'John Reviewer']);
        $reviewed = User::factory()->create(['name' => 'Jane Reviewed']);
        
        $review = Review::factory()->create([
            'reviewer_user_id' => $reviewer->id,
            'reviewed_user_id' => $reviewed->id,
            'rating' => 5,
            'comment' => 'Excellent helper, very caring with cats!',
            'status' => 'active',
            'is_flagged' => false,
        ]);

        $this->assertEquals('active', $review->status);
        $this->assertFalse($review->is_flagged);
        $this->assertEquals('John Reviewer', $review->reviewer->name);
        $this->assertEquals('Jane Reviewed', $review->reviewed->name);
    }

    public function test_review_factory_creates_different_statuses(): void
    {
        $reviewer = User::factory()->create();
        $reviewed = User::factory()->create();
        
        $activeReview = Review::factory()->create([
            'reviewer_user_id' => $reviewer->id,
            'reviewed_user_id' => $reviewed->id,
            'status' => 'active',
        ]);
        
        $hiddenReview = Review::factory()->hidden()->create([
            'reviewer_user_id' => $reviewer->id,
            'reviewed_user_id' => $reviewed->id,
        ]);

        $this->assertEquals('active', $activeReview->status);
        $this->assertEquals('hidden', $hiddenReview->status);
    }

    public function test_review_flagged_factory_state(): void
    {
        $reviewer = User::factory()->create();
        $reviewed = User::factory()->create();
        
        $flaggedReview = Review::factory()->flagged()->create([
            'reviewer_user_id' => $reviewer->id,
            'reviewed_user_id' => $reviewed->id,
        ]);
        
        $normalReview = Review::factory()->create([
            'reviewer_user_id' => $reviewer->id,
            'reviewed_user_id' => $reviewed->id,
        ]);

        $this->assertTrue($flaggedReview->is_flagged);
        $this->assertEquals('flagged', $flaggedReview->status);
        $this->assertNotNull($flaggedReview->flagged_at);
        
        $this->assertFalse($normalReview->is_flagged);
        $this->assertEquals('active', $normalReview->status);
    }

    public function test_review_moderation_updates(): void
    {
        $reviewer = User::factory()->create();
        $reviewed = User::factory()->create();
        $moderator = User::factory()->create();
        
        $review = Review::factory()->create([
            'reviewer_user_id' => $reviewer->id,
            'reviewed_user_id' => $reviewed->id,
            'status' => 'active',
        ]);

        // Test moderation update
        $review->update([
            'status' => 'hidden',
            'moderated_by' => $moderator->id,
            'moderated_at' => now(),
            'moderation_notes' => 'Hidden due to inappropriate content',
        ]);

        $this->assertEquals('hidden', $review->fresh()->status);
        $this->assertEquals($moderator->id, $review->fresh()->moderated_by);
        $this->assertNotNull($review->fresh()->moderated_at);
        $this->assertEquals('Hidden due to inappropriate content', $review->fresh()->moderation_notes);
    }

    public function test_review_rating_validation(): void
    {
        $reviewer = User::factory()->create();
        $reviewed = User::factory()->create();
        
        // Test valid ratings
        foreach ([1, 2, 3, 4, 5] as $rating) {
            $review = Review::factory()->create([
                'reviewer_user_id' => $reviewer->id,
                'reviewed_user_id' => $reviewed->id,
                'rating' => $rating,
            ]);
            
            $this->assertEquals($rating, $review->rating);
        }
    }

    public function test_review_relationships_load_correctly(): void
    {
        $reviewer = User::factory()->create(['name' => 'Test Reviewer']);
        $reviewed = User::factory()->create(['name' => 'Test Reviewed']);
        
        $review = Review::factory()->create([
            'reviewer_user_id' => $reviewer->id,
            'reviewed_user_id' => $reviewed->id,
        ]);

        $this->assertEquals('Test Reviewer', $review->reviewer->name);
        $this->assertEquals('Test Reviewed', $review->reviewed->name);
    }

    public function test_can_bulk_moderate_reviews(): void
    {
        $reviewer = User::factory()->create();
        $reviewed = User::factory()->create();
        
        $reviews = Review::factory()->count(3)->create([
            'reviewer_user_id' => $reviewer->id,
            'reviewed_user_id' => $reviewed->id,
            'status' => 'active',
        ]);
        
        // Verify all reviews are initially active
        foreach ($reviews as $review) {
            $this->assertDatabaseHas('reviews', [
                'id' => $review->id,
                'status' => 'active',
            ]);
        }
        
        // Test bulk moderation by updating all reviews
        foreach ($reviews as $review) {
            $review->update(['status' => 'hidden']);
        }
        
        // Verify all reviews are now hidden
        foreach ($reviews as $review) {
            $this->assertDatabaseHas('reviews', [
                'id' => $review->id,
                'status' => 'hidden',
            ]);
        }
    }
}
