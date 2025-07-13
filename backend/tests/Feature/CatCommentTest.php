<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\CatComment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class CatCommentTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_can_get_comments_for_a_cat()
    {
        $cat = Cat::factory()->create();
        CatComment::factory()->count(3)->create(['cat_id' => $cat->id]);

        $response = $this->getJson("/api/cats/{$cat->id}/comments");

        $response->assertOk();
        $response->assertJsonCount(3);
    }

    #[Test]
    public function test_authenticated_user_can_add_comment_to_cat_profile()
    {
        $user = User::factory()->create();
        $cat = Cat::factory()->create();

        $response = $this->actingAs($user)->postJson("/api/cats/{$cat->id}/comments", [
            'comment' => 'This is a test comment.',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('cat_comments', [
            'cat_id' => $cat->id,
            'user_id' => $user->id,
            'comment' => 'This is a test comment.',
        ]);
    }

    #[Test]
    public function test_guest_cannot_add_comment()
    {
        $cat = Cat::factory()->create();

        $response = $this->postJson("/api/cats/{$cat->id}/comments", [
            'comment' => 'This is a test comment.',
        ]);

        $response->assertUnauthorized();
        $this->assertDatabaseMissing('cat_comments', [
            'cat_id' => $cat->id,
            'comment' => 'This is a test comment.',
        ]);
    }
}