<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Tests\Traits\CreatesUsers;

class UserProfileTest extends TestCase
{
    use CreatesUsers;
    use RefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = $this->createUserAndLogin();
    }

    #[Test]
    public function authenticated_user_can_update_their_password_successfully()
    {
        $response = $this->putJson('/api/users/me/password', [
            'current_password' => 'password',
            'new_password' => 'new_password',
            'new_password_confirmation' => 'new_password',
        ]);

        $response->assertStatus(204);

        $this->assertTrue(Hash::check('new_password', $this->user->fresh()->password));
    }

    #[Test]
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

    #[Test]
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

    #[Test]
    public function authenticated_user_can_delete_their_account_successfully()
    {
        $response = $this->deleteJson('/api/users/me', [
            'password' => 'password',
        ]);

        $response->assertStatus(204);

        $this->assertDatabaseMissing('users', ['id' => $this->user->id]);
    }

    #[Test]
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
