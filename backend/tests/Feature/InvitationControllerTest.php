<?php

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;
use Tests\Traits\CreatesUsers;

class InvitationControllerTest extends TestCase
{
    use RefreshDatabase, CreatesUsers;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake(); // Prevent actual emails during testing
    }

    public function test_authenticated_user_can_generate_invitation()
    {
        $user = $this->createUserAndLogin();

        $response = $this->postJson('/api/invitations');

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'code',
                    'status',
                    'expires_at',
                    'invitation_url',
                    'created_at'
                ]
            ]);

        $this->assertDatabaseHas('invitations', [
            'inviter_user_id' => $user->id,
            'status' => 'pending'
        ]);
    }

    public function test_unauthenticated_user_cannot_generate_invitation()
    {
        $response = $this->postJson('/api/invitations');

        $response->assertStatus(401);
    }

    public function test_can_generate_invitation_with_custom_expiry()
    {
        $user = $this->createUserAndLogin();
        $expiryDate = Carbon::now()->addDays(7)->toISOString();

        $response = $this->postJson('/api/invitations', [
            'expires_at' => $expiryDate
        ]);

        $response->assertStatus(201);

        $invitation = Invitation::where('inviter_user_id', $user->id)->first();
        $this->assertNotNull($invitation->expires_at);
    }

    public function test_can_generate_invitation_to_specific_email()
    {
        $user = $this->createUserAndLogin();
        $email = 'invite@example.com';

        $response = $this->postJson('/api/invitations', [
            'email' => $email
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('invitations', [
            'inviter_user_id' => $user->id,
            'status' => 'pending'
        ]);
    }

    public function test_invitation_generation_respects_rate_limiting()
    {
        $user = $this->createUserAndLogin();

        // Generate multiple invitations quickly
        $successCount = 0;
        for ($i = 0; $i < 15; $i++) {
            $response = $this->postJson('/api/invitations');
            if ($response->getStatusCode() === 201) {
                $successCount++;
            }
        }

        // Should have some rate limiting in place
        $this->assertLessThan(15, $successCount);
    }

    public function test_authenticated_user_can_list_their_invitations()
    {
        $user = $this->createUserAndLogin();
        $otherUser = User::factory()->create();

        // Create invitations for both users
        $userInvitation = Invitation::factory()->create(['inviter_user_id' => $user->id]);
        $otherInvitation = Invitation::factory()->create(['inviter_user_id' => $otherUser->id]);

        $response = $this->getJson('/api/invitations');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'code',
                        'status',
                        'expires_at',
                        'invitation_url',
                        'created_at',
                        'recipient'
                    ]
                ]
            ]);

        // Should only see their own invitations
        $responseData = $response->json('data');
        $this->assertCount(1, $responseData);
        $this->assertEquals($userInvitation->id, $responseData[0]['id']);
    }

    public function test_unauthenticated_user_cannot_list_invitations()
    {
        $response = $this->getJson('/api/invitations');

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_revoke_their_invitation()
    {
        $user = $this->createUserAndLogin();
        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $user->id,
            'status' => 'pending'
        ]);

        $response = $this->deleteJson("/api/invitations/{$invitation->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => []
            ]);

        $invitation->refresh();
        $this->assertEquals('revoked', $invitation->status);
    }

    public function test_user_cannot_revoke_other_users_invitation()
    {
        $user = $this->createUserAndLogin();
        $otherUser = User::factory()->create();
        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $otherUser->id,
            'status' => 'pending'
        ]);

        $response = $this->deleteJson("/api/invitations/{$invitation->id}");

        $response->assertStatus(404)
            ->assertJson([
                'error' => 'Invitation not found or cannot be revoked'
            ]);

        $invitation->refresh();
        $this->assertEquals('pending', $invitation->status);
    }

    public function test_cannot_revoke_already_accepted_invitation()
    {
        $user = $this->createUserAndLogin();
        $recipient = User::factory()->create();
        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $user->id,
            'status' => 'accepted',
            'recipient_user_id' => $recipient->id
        ]);

        $response = $this->deleteJson("/api/invitations/{$invitation->id}");

        $response->assertStatus(404)
            ->assertJson([
                'error' => 'Invitation not found or cannot be revoked'
            ]);

        $invitation->refresh();
        $this->assertEquals('accepted', $invitation->status);
    }

    public function test_cannot_revoke_non_existent_invitation()
    {
        $user = $this->createUserAndLogin();

        $response = $this->deleteJson('/api/invitations/999');

        $response->assertStatus(404)
            ->assertJson([
                'error' => 'Invitation not found or cannot be revoked'
            ]);
    }

    public function test_invitation_response_includes_proper_url()
    {
        $user = $this->createUserAndLogin();

        $response = $this->postJson('/api/invitations');

        $response->assertStatus(201);

        $data = $response->json('data');
        $this->assertStringContainsString('invitation_code=', $data['invitation_url']);
        $this->assertStringContainsString($data['code'], $data['invitation_url']);
    }

    public function test_invitation_list_is_ordered_by_creation_date()
    {
        $user = $this->createUserAndLogin();

        // Create invitations with different timestamps
        $invitation1 = Invitation::factory()->create([
            'inviter_user_id' => $user->id,
            'created_at' => Carbon::now()->subDays(2)
        ]);
        $invitation2 = Invitation::factory()->create([
            'inviter_user_id' => $user->id,
            'created_at' => Carbon::now()->subDay()
        ]);
        $invitation3 = Invitation::factory()->create([
            'inviter_user_id' => $user->id,
            'created_at' => Carbon::now()
        ]);

        $response = $this->getJson('/api/invitations');

        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertCount(3, $data);

        // Should be ordered by created_at desc (newest first)
        $this->assertEquals($invitation3->id, $data[0]['id']);
        $this->assertEquals($invitation2->id, $data[1]['id']);
        $this->assertEquals($invitation1->id, $data[2]['id']);
    }

    public function test_invitation_includes_recipient_information_when_accepted()
    {
        $user = $this->createUserAndLogin();
        $recipient = User::factory()->create();
        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $user->id,
            'status' => 'accepted',
            'recipient_user_id' => $recipient->id
        ]);

        $response = $this->getJson('/api/invitations');

        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertNotNull($data[0]['recipient']);
        $this->assertEquals($recipient->id, $data[0]['recipient']['id']);
        $this->assertEquals($recipient->email, $data[0]['recipient']['email']);
    }
}
