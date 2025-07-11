<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class UserProfileTest extends TestCase
{
    use RefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        Sanctum::actingAs($this->user);
    }

    /** @test */
    public function authenticated_user_can_update_their_password_successfully()
    {
        $response = $this->putJson('/api/users/me/password', [
            'current_password' => 'password',
            'new_password' => 'new_password',
            'new_password_confirmation' => 'new_password',
        ]);

        $response->assertStatus(200)
                 ->assertJson(['message' => 'Password updated successfully.']);

        $this->assertTrue(Hash::check('new_password', $this->user->fresh()->password));
    }

    /** @test */
    public function update_password_fails_with_incorrect_current_password()
    {
        $response = $this->putJson('/api/users/me/password', [
            'current_password' => 'wrong_password',
            'new_password' => 'new_password',
            'new_password_confirmation' => 'new_password',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['current_password']);

        $this->assertTrue(Hash::check('password', $this->user->fresh()->password));
    }

    /** @test */
    public function update_password_fails_with_mismatched_new_password_confirmation()
    {
        $response = $this->putJson('/api/users/me/password', [
            'current_password' => 'password',
            'new_password' => 'new_password',
            'new_password_confirmation' => 'mismatched_password',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['new_password']);

        $this->assertTrue(Hash::check('password', $this->user->fresh()->password));
    }

    /** @test */
    public function authenticated_user_can_delete_their_account_successfully()
    {
        $response = $this->deleteJson('/api/users/me', [
            'password' => 'password',
        ]);

        $response->assertStatus(200)
                 ->assertJson(['message' => 'Account deleted successfully.']);

        $this->assertDatabaseMissing('users', ['id' => $this->user->id]);
    }

    /** @test */
    public function delete_account_fails_with_incorrect_password()
    {
        $response = $this->deleteJson('/api/users/me', [
            'password' => 'wrong_password',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['password']);

        $this->assertDatabaseHas('users', ['id' => $this->user->id]);
    }

    
}
