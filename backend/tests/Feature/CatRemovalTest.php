<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use App\Enums\CatStatus;

class CatRemovalTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Cat $cat;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'password' => Hash::make('password123'),
        ]);

        $this->cat = Cat::factory()->create([
            'user_id' => $this->user->id,
        ]);
    }

    #[Test]
    public function it_fails_to_delete_a_cat_profile_with_an_incorrect_password()
    {
        $response = $this->actingAs($this->user)->deleteJson(route('cats.destroy', $this->cat), [
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('password');
        $this->assertDatabaseHas('cats', ['id' => $this->cat->id]);
    }

    #[Test]
    public function it_successfully_deletes_a_cat_profile_with_the_correct_password()
    {
        $response = $this->actingAs($this->user)->deleteJson(route('cats.destroy', $this->cat), [
            'password' => 'password123',
        ]);

        $response->assertStatus(204);
        $this->assertDatabaseMissing('cats', ['id' => $this->cat->id]);
    }

    #[Test]
    public function it_fails_to_mark_a_cat_as_deceased_with_an_incorrect_password()
    {
        $response = $this->actingAs($this->user)->putJson(route('cats.updateStatus', $this->cat), [
            'status' => CatStatus::DECEASED->value,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('password');
        $this->assertDatabaseHas('cats', [
            'id' => $this->cat->id,
            'status' => $this->cat->status,
        ]);
    }

    #[Test]
    public function it_successfully_marks_a_cat_as_deceased_with_the_correct_password()
    {
        $response = $this->actingAs($this->user)->putJson(route('cats.updateStatus', $this->cat), [
            'status' => CatStatus::DECEASED->value,
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('cats', [
            'id' => $this->cat->id,
            'status' => CatStatus::DECEASED->value,
        ]);
    }
}
