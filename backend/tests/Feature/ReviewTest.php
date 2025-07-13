<?php

namespace Tests\Feature;

use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_user_can_leave_review_for_helper()
    {
        $reviewer = User::factory()->create();
        $helper = User::factory()->create();

        $transfer = \App\Models\TransferRequest::factory()->create();
        $response = $this->actingAs($reviewer)->postJson('/api/reviews', [
            'reviewed_user_id' => $helper->id,
            'rating' => 5,
            'comment' => 'Great helper!',
            'transfer_id' => $transfer->id,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('reviews', [
            'reviewer_user_id' => $reviewer->id,
            'reviewed_user_id' => $helper->id,
            'rating' => 5,
            'comment' => 'Great helper!',
            'transfer_id' => $transfer->id,
        ]);
    }

    #[Test]
    public function test_can_get_reviews_for_a_user()
    {
        $user = User::factory()->create();
        Review::factory()->count(3)->create(['reviewed_user_id' => $user->id]);

        $response = $this->getJson("/api/users/{$user->id}/reviews");

        $response->assertOk();
        $response->assertJsonCount(3);
    }

    #[Test]
    public function test_cannot_review_the_same_user_multiple_times_for_same_transfer()
    {
        $reviewer = User::factory()->create();
        $helper = User::factory()->create();

        $transfer = \App\Models\TransferRequest::factory()->create();
        $transfer = \App\Models\TransferRequest::factory()->create();
        $transfer = \App\Models\TransferRequest::factory()->create();
        Review::factory()->create([
            'reviewer_user_id' => $reviewer->id,
            'reviewed_user_id' => $helper->id,
            'transfer_id' => $transfer->id,
        ]);

        $response = $this->actingAs($reviewer)->postJson('/api/reviews', [
            'reviewed_user_id' => $helper->id,
            'rating' => 4,
            'comment' => 'Another review',
            'transfer_id' => $transfer->id,
        ]);

        $response->assertStatus(409); // Conflict
        $response->assertJson(['message' => 'You have already reviewed this user for this transfer.']);
    }
}
