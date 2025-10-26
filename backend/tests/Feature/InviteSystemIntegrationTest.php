<?php

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Settings;
use App\Models\User;
use App\Models\WaitlistEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;
use Tests\Traits\CreatesUsers;

class InviteSystemIntegrationTest extends TestCase
{
    use CreatesUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        Notification::fake();
    }

    public function test_complete_waitlist_to_invitation_to_registration_flow()
    {
        // Step 1: Enable invite-only mode
        Settings::set('invite_only_enabled', 'true');

        // Step 2: User joins waitlist
        $email = 'waitlist@example.com';
        $waitlistResponse = $this->postJson('/api/waitlist', [
            'email' => $email,
        ]);

        $waitlistResponse->assertStatus(201);
        $this->assertDatabaseHas('waitlist_entries', [
            'email' => $email,
            'status' => 'pending',
        ]);

        // Step 3: Admin invites user from waitlist
        $admin = $this->createUserAndLogin();
        $invitationResponse = $this->postJson('/api/invitations', [
            'email' => $email,
        ]);

        $invitationResponse->assertStatus(201);

        $invitation = Invitation::where('inviter_user_id', $admin->id)->first();
        $this->assertNotNull($invitation);

        // Waitlist entry should be marked as invited
        $waitlistEntry = WaitlistEntry::where('email', $email)->first();
        $this->assertEquals('invited', $waitlistEntry->status);

        // Step 4: User registers with invitation code
        $registrationResponse = $this->postJson('/register', [
            'name' => 'Waitlist User',
            'email' => $email,
            'password' => 'password',
            'password_confirmation' => 'password',
            'invitation_code' => $invitation->code,
        ]);

        $registrationResponse->assertStatus(201);

        // Verify user was created
        $this->assertDatabaseHas('users', [
            'email' => $email,
            'name' => 'Waitlist User',
        ]);

        // Invitation should be marked as accepted
        $invitation->refresh();
        $this->assertEquals('accepted', $invitation->status);
        $this->assertNotNull($invitation->recipient_user_id);
    }

    public function test_direct_invitation_flow_without_waitlist()
    {
        Settings::set('invite_only_enabled', 'true');

        // Step 1: User generates invitation
        $inviter = $this->createUserAndLogin();
        $email = 'direct@example.com';

        $invitationResponse = $this->postJson('/api/invitations', [
            'email' => $email,
        ]);

        $invitationResponse->assertStatus(201);

        $invitation = Invitation::where('inviter_user_id', $inviter->id)->first();
        $this->assertNotNull($invitation);

        // Step 2: Recipient registers with invitation code
        $registrationResponse = $this->postJson('/register', [
            'name' => 'Direct User',
            'email' => $email,
            'password' => 'password',
            'password_confirmation' => 'password',
            'invitation_code' => $invitation->code,
        ]);

        $registrationResponse->assertStatus(201);

        // Verify user was created
        $this->assertDatabaseHas('users', [
            'email' => $email,
            'name' => 'Direct User',
        ]);

        // Invitation should be marked as accepted
        $invitation->refresh();
        $this->assertEquals('accepted', $invitation->status);
    }

    public function test_invitation_lifecycle_management()
    {
        $inviter = $this->createUserAndLogin();

        // Generate invitation
        $invitationResponse = $this->postJson('/api/invitations');
        $invitationResponse->assertStatus(201);

        $invitation = Invitation::where('inviter_user_id', $inviter->id)->first();
        $this->assertEquals('pending', $invitation->status);

        // List invitations
        $listResponse = $this->getJson('/api/invitations');
        $listResponse->assertStatus(200);

        $invitations = $listResponse->json('data');
        $this->assertCount(1, $invitations);
        $this->assertEquals($invitation->id, $invitations[0]['id']);

        // Revoke invitation
        $revokeResponse = $this->deleteJson("/api/invitations/{$invitation->id}");
        $revokeResponse->assertStatus(200);

        $invitation->refresh();
        $this->assertEquals('revoked', $invitation->status);

        // Try to use revoked invitation
        Settings::set('invite_only_enabled', 'true');
        $registrationResponse = $this->postJson('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'invitation_code' => $invitation->code,
        ]);

        $registrationResponse->assertStatus(422)
            ->assertJsonValidationErrors(['invitation_code']);
    }

    public function test_system_behavior_when_switching_between_modes()
    {
        // Start with open registration
        Settings::set('invite_only_enabled', 'false');

        // Verify settings endpoint
        $settingsResponse = $this->getJson('/api/settings/public');
        $settingsResponse->assertStatus(200)
            ->assertJson(['data' => ['invite_only_enabled' => false]]);

        // User can register without invitation
        $openRegResponse = $this->postJson('/register', [
            'name' => 'Open User',
            'email' => 'open@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $openRegResponse->assertStatus(201);

        // Switch to invite-only mode
        Settings::set('invite_only_enabled', 'true');

        // Verify settings updated
        Cache::flush(); // Clear cache to get fresh settings
        $settingsResponse2 = $this->getJson('/api/settings/public');
        $settingsResponse2->assertStatus(200)
            ->assertJson(['data' => ['invite_only_enabled' => true]]);

        // User cannot register without invitation
        $closedRegResponse = $this->postJson('/register', [
            'name' => 'Closed User',
            'email' => 'closed@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $closedRegResponse->assertStatus(422)
            ->assertJsonValidationErrors(['invitation_code']);

        // But can join waitlist
        $waitlistResponse = $this->postJson('/api/waitlist', [
            'email' => 'waitlist@example.com',
        ]);

        $waitlistResponse->assertStatus(201);
    }

    public function test_rate_limiting_across_endpoints()
    {
        // Test waitlist rate limiting
        $waitlistAttempts = 0;
        for ($i = 0; $i < 10; $i++) {
            $response = $this->postJson('/api/waitlist', [
                'email' => "test{$i}@example.com",
            ]);

            if ($response->getStatusCode() === 201) {
                $waitlistAttempts++;
            }
        }

        // Test invitation generation rate limiting
        $user = $this->createUserAndLogin();
        $invitationAttempts = 0;
        for ($i = 0; $i < 15; $i++) {
            $response = $this->postJson('/api/invitations');

            if ($response->getStatusCode() === 201) {
                $invitationAttempts++;
            }
        }

        // Should have some rate limiting in place
        $this->assertLessThan(10, $waitlistAttempts);
        $this->assertLessThan(15, $invitationAttempts);
    }

    public function test_error_handling_and_validation_consistency()
    {
        Settings::set('invite_only_enabled', 'true');

        // Test consistent error responses across endpoints
        $endpoints = [
            ['POST', '/api/waitlist', ['email' => 'invalid-email']],
            ['POST', '/register', ['email' => 'invalid-email']],
        ];

        foreach ($endpoints as [$method, $url, $data]) {
            $response = $this->json($method, $url, $data);

            $response->assertStatus(422)
                ->assertJsonValidationErrors(['email']);

            // Ensure error format is consistent
            $this->assertArrayHasKey('message', $response->json());
            $this->assertArrayHasKey('errors', $response->json());
        }
    }

    public function test_database_consistency_during_concurrent_operations()
    {
        $user = $this->createUserAndLogin();

        // Create invitation
        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $user->id,
            'status' => 'pending',
        ]);

        // Simulate concurrent acceptance attempts
        Settings::set('invite_only_enabled', 'true');

        $response1 = $this->postJson('/register', [
            'name' => 'User One',
            'email' => 'user1@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'invitation_code' => $invitation->code,
        ]);

        $response2 = $this->postJson('/register', [
            'name' => 'User Two',
            'email' => 'user2@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'invitation_code' => $invitation->code,
        ]);

        // Only one should succeed
        $successCount = 0;
        if ($response1->getStatusCode() === 201) {
            $successCount++;
        }
        if ($response2->getStatusCode() === 201) {
            $successCount++;
        }

        $this->assertEquals(1, $successCount);

        // Invitation should be accepted only once
        $invitation->refresh();
        $this->assertEquals('accepted', $invitation->status);
    }

    public function test_system_statistics_and_reporting()
    {
        $user = $this->createUserAndLogin();

        // Create various invitations and waitlist entries
        $invitation1 = Invitation::factory()->create(['inviter_user_id' => $user->id, 'status' => 'pending']);
        $invitation2 = Invitation::factory()->create(['inviter_user_id' => $user->id, 'status' => 'accepted']);
        $invitation3 = Invitation::factory()->create(['inviter_user_id' => $user->id, 'status' => 'revoked']);

        WaitlistEntry::factory()->create(['status' => 'pending']);
        WaitlistEntry::factory()->create(['status' => 'invited']);

        // Test that the system maintains accurate counts
        $this->assertEquals(3, Invitation::where('inviter_user_id', $user->id)->count());
        $this->assertEquals(1, Invitation::where('inviter_user_id', $user->id)->where('status', 'pending')->count());
        $this->assertEquals(1, Invitation::where('inviter_user_id', $user->id)->where('status', 'accepted')->count());
        $this->assertEquals(1, Invitation::where('inviter_user_id', $user->id)->where('status', 'revoked')->count());

        $this->assertEquals(2, WaitlistEntry::count());
        $this->assertEquals(1, WaitlistEntry::where('status', 'pending')->count());
        $this->assertEquals(1, WaitlistEntry::where('status', 'invited')->count());
    }
}
