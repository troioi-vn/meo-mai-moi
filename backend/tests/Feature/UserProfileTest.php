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
    public function authenticated_user_can_update_their_name()
    {
        $response = $this->putJson('/api/users/me', [
            'name' => 'New Name',
            'email' => $this->user->email,
        ]);

        $response->assertStatus(200);

        $this->assertEquals('New Name', $this->user->fresh()->name);
    }

    #[Test]
    public function update_profile_fails_with_invalid_name()
    {
        $response = $this->putJson('/api/users/me', [
            'name' => '',
            'email' => $this->user->email,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    #[Test]
    public function authenticated_user_can_update_their_password_successfully()
    {
        $response = $this->putJson('/api/users/me/password', [
            'current_password' => 'password',
            'new_password' => 'new_password',
            'new_password_confirmation' => 'new_password',
        ]);

        $response->assertStatus(200);

        $this->assertTrue(Hash::check('new_password', $this->user->fresh()->password));
    }

    #[Test]
    public function authenticated_user_profile_includes_has_password_true_when_password_is_set()
    {
        $response = $this->getJson('/api/users/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.has_password', true);
    }

    #[Test]
    public function authenticated_user_profile_includes_has_password_false_when_password_is_not_set()
    {
        $user = $this->createUserAndLogin([
            'password' => null,
        ]);

        $response = $this->getJson('/api/users/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.has_password', false);

        $this->assertNull($user->fresh()->password);
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
    public function update_password_fails_with_clear_message_when_user_has_no_password_set()
    {
        $user = $this->createUserAndLogin([
            'password' => null,
        ]);

        $response = $this->putJson('/api/users/me/password', [
            'current_password' => 'any_value',
            'new_password' => 'new_password',
            'new_password_confirmation' => 'new_password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['current_password'])
            ->assertJsonPath(
                'errors.current_password.0',
                'This account has no password set. Please use the password reset option to set one.'
            );

        $this->assertNull($user->fresh()->password);
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

        $response->assertStatus(200);

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
