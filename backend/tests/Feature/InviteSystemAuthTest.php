<?php

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Settings;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class InviteSystemAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush(); // Clear cache before each test
    }

    public function test_user_can_register_when_invite_only_is_disabled()
    {
        Settings::set('invite_only_enabled', 'false');

        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'access_token',
                    'token_type',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
        ]);
    }

    public function test_user_cannot_register_when_invite_only_is_enabled_without_code()
    {
        Settings::set('invite_only_enabled', 'true');

        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['invitation_code']);

        $this->assertDatabaseMissing('users', [
            'email' => 'test@example.com',
        ]);
    }

    public function test_user_can_register_with_valid_invitation_code()
    {
        Settings::set('invite_only_enabled', 'true');

        $inviter = User::factory()->create();
        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $inviter->id,
            'status' => 'pending',
            'expires_at' => null,
        ]);

        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'invitation_code' => $invitation->code,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'access_token',
                    'token_type',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
        ]);

        // Invitation should be marked as accepted
        $invitation->refresh();
        $this->assertEquals('accepted', $invitation->status);
        $this->assertNotNull($invitation->recipient_user_id);
    }

    public function test_user_cannot_register_with_invalid_invitation_code()
    {
        Settings::set('invite_only_enabled', 'true');

        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'invitation_code' => 'invalid-code',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['invitation_code']);

        $this->assertDatabaseMissing('users', [
            'email' => 'test@example.com',
        ]);
    }

    public function test_user_cannot_register_with_expired_invitation_code()
    {
        Settings::set('invite_only_enabled', 'true');

        $inviter = User::factory()->create();
        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $inviter->id,
            'status' => 'pending',
            'expires_at' => now()->subDay(),
        ]);

        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'invitation_code' => $invitation->code,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['invitation_code']);

        $this->assertDatabaseMissing('users', [
            'email' => 'test@example.com',
        ]);
    }

    public function test_user_cannot_register_with_already_used_invitation_code()
    {
        Settings::set('invite_only_enabled', 'true');

        $inviter = User::factory()->create();
        $recipient = User::factory()->create();
        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $inviter->id,
            'status' => 'accepted',
            'recipient_user_id' => $recipient->id,
        ]);

        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'invitation_code' => $invitation->code,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['invitation_code']);

        $this->assertDatabaseMissing('users', [
            'email' => 'test@example.com',
        ]);
    }

    public function test_user_cannot_register_with_revoked_invitation_code()
    {
        Settings::set('invite_only_enabled', 'true');

        $inviter = User::factory()->create();
        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $inviter->id,
            'status' => 'revoked',
        ]);

        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'invitation_code' => $invitation->code,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['invitation_code']);

        $this->assertDatabaseMissing('users', [
            'email' => 'test@example.com',
        ]);
    }

    public function test_invitation_code_is_optional_when_invite_only_is_disabled()
    {
        Settings::set('invite_only_enabled', 'false');

        $inviter = User::factory()->create();
        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $inviter->id,
            'status' => 'pending',
        ]);

        // Should work without invitation code
        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
        ]);

        // Invitation should remain pending since it wasn't used
        $invitation->refresh();
        $this->assertEquals('pending', $invitation->status);
    }

    public function test_invitation_code_is_accepted_even_when_invite_only_is_disabled()
    {
        Settings::set('invite_only_enabled', 'false');

        $inviter = User::factory()->create();
        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $inviter->id,
            'status' => 'pending',
        ]);

        // Should work with invitation code even when not required
        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'invitation_code' => $invitation->code,
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
        ]);

        // Invitation should be marked as accepted
        $invitation->refresh();
        $this->assertEquals('accepted', $invitation->status);
    }

    public function test_registration_works_correctly_when_switching_invite_modes()
    {
        // Start with invite-only disabled
        Settings::set('invite_only_enabled', 'false');

        $response1 = $this->postJson('/api/register', [
            'name' => 'User One',
            'email' => 'user1@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response1->assertStatus(201);

        // Switch to invite-only enabled
        Settings::set('invite_only_enabled', 'true');

        $response2 = $this->postJson('/api/register', [
            'name' => 'User Two',
            'email' => 'user2@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response2->assertStatus(422)
            ->assertJsonValidationErrors(['invitation_code']);

        // Create valid invitation and try again
        $inviter = User::factory()->create();
        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $inviter->id,
            'status' => 'pending',
        ]);

        $response3 = $this->postJson('/api/register', [
            'name' => 'User Three',
            'email' => 'user3@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'invitation_code' => $invitation->code,
        ]);

        $response3->assertStatus(201);

        $this->assertDatabaseHas('users', ['email' => 'user1@example.com']);
        $this->assertDatabaseMissing('users', ['email' => 'user2@example.com']);
        $this->assertDatabaseHas('users', ['email' => 'user3@example.com']);
    }

    public function test_registration_validates_other_fields_regardless_of_invite_mode()
    {
        Settings::set('invite_only_enabled', 'true');

        $inviter = User::factory()->create();
        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $inviter->id,
            'status' => 'pending',
        ]);

        // Missing required fields
        $response = $this->postJson('/api/register', [
            'invitation_code' => $invitation->code,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password']);

        // Invalid email format
        $response2 = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'invalid-email',
            'password' => 'password',
            'password_confirmation' => 'password',
            'invitation_code' => $invitation->code,
        ]);

        $response2->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}
