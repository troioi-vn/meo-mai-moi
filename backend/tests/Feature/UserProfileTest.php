<?php

namespace Tests\Feature;

use App\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
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
    public function authenticated_user_can_change_email_and_must_reverify(): void
    {
        Notification::fake();

        $response = $this->putJson('/api/users/me', [
            'name' => $this->user->name,
            'email' => 'new.address@example.com',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email', 'new.address@example.com')
            ->assertJsonPath('data.requires_email_verification', true)
            ->assertJsonPath('data.verification_email_sent', true)
            ->assertJsonPath('data.email_verified_at', null);

        $updatedUser = $this->user->fresh();
        $this->assertSame('new.address@example.com', $updatedUser->email);
        $this->assertNull($updatedUser->email_verified_at);

        Notification::assertSentTo($updatedUser, VerifyEmail::class);
    }

    #[Test]
    public function updating_profile_without_email_change_does_not_send_verification_email(): void
    {
        Notification::fake();

        $response = $this->putJson('/api/users/me', [
            'name' => 'Only Name Changed',
            'email' => $this->user->email,
        ]);

        $response->assertOk();

        Notification::assertNothingSent();
        $this->assertNotNull($this->user->fresh()->email_verified_at);
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
            'current_password' => 'Password1secure',
            'new_password' => 'NewPassword2strong',
            'new_password_confirmation' => 'NewPassword2strong',
        ]);

        $response->assertStatus(200);

        $this->assertTrue(Hash::check('NewPassword2strong', $this->user->fresh()->password));
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
            'new_password' => 'NewPassword2strong',
            'new_password_confirmation' => 'NewPassword2strong',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);

        $this->assertTrue(Hash::check('Password1secure', $this->user->fresh()->password));
    }

    #[Test]
    public function update_password_fails_with_clear_message_when_user_has_no_password_set()
    {
        $user = $this->createUserAndLogin([
            'password' => null,
        ]);

        $response = $this->putJson('/api/users/me/password', [
            'current_password' => 'any_value',
            'new_password' => 'NewPassword2strong',
            'new_password_confirmation' => 'NewPassword2strong',
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
            'current_password' => 'Password1secure',
            'new_password' => 'new_password',
            'new_password_confirmation' => 'mismatched_password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['new_password']);

        $this->assertTrue(Hash::check('Password1secure', $this->user->fresh()->password));
    }

    #[Test]
    public function authenticated_user_can_delete_their_account_successfully()
    {
        $response = $this->deleteJson('/api/users/me', [
            'password' => 'Password1secure',
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
