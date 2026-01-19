<?php

namespace Tests\Feature;

use App\Enums\ChatType;
use App\Enums\ChatUserRole;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MessagingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected User $otherUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->otherUser = User::factory()->create();
    }

    public function test_user_can_list_their_chats()
    {
        Sanctum::actingAs($this->user);

        $chat = Chat::factory()->create(['type' => ChatType::DIRECT]);
        $chat->participants()->attach([
            $this->user->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
            $this->otherUser->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
        ]);

        ChatMessage::factory()->create([
            'chat_id' => $chat->id,
            'sender_id' => $this->otherUser->id,
            'content' => 'Hello there',
        ]);

        $response = $this->getJson('/api/msg/chats');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $chat->id)
            ->assertJsonPath('data.0.latest_message.content', 'Hello there');
    }

    public function test_user_can_create_direct_chat()
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/msg/chats', [
            'type' => 'direct',
            'recipient_id' => $this->otherUser->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.type', 'direct');

        $this->assertDatabaseHas('chats', ['type' => 'direct']);
        $this->assertDatabaseHas('chat_users', ['user_id' => $this->user->id]);
        $this->assertDatabaseHas('chat_users', ['user_id' => $this->otherUser->id]);
    }

    public function test_user_can_create_chat_with_context()
    {
        Sanctum::actingAs($this->user);

        $placementRequest = PlacementRequest::factory()->create([
            'user_id' => $this->otherUser->id,
        ]);

        $response = $this->postJson('/api/msg/chats', [
            'type' => 'direct',
            'recipient_id' => $this->otherUser->id,
            'contextable_type' => 'PlacementRequest',
            'contextable_id' => $placementRequest->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.contextable_type', 'PlacementRequest')
            ->assertJsonPath('data.contextable_id', $placementRequest->id);
    }

    public function test_placement_request_owner_can_create_context_chat_with_helper_who_responded()
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();

        $helperProfile = HelperProfile::factory()->create([
            'user_id' => $helper->id,
        ]);

        $placementRequest = PlacementRequest::factory()->create([
            'user_id' => $owner->id,
        ]);

        PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/msg/chats', [
            'type' => 'direct',
            'recipient_id' => $helper->id,
            'contextable_type' => 'PlacementRequest',
            'contextable_id' => $placementRequest->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.contextable_type', 'PlacementRequest')
            ->assertJsonPath('data.contextable_id', $placementRequest->id);
    }

    public function test_placement_request_owner_cannot_create_context_chat_with_unrelated_user()
    {
        $owner = User::factory()->create();
        $unrelatedUser = User::factory()->create();

        $placementRequest = PlacementRequest::factory()->create([
            'user_id' => $owner->id,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/msg/chats', [
            'type' => 'direct',
            'recipient_id' => $unrelatedUser->id,
            'contextable_type' => 'PlacementRequest',
            'contextable_id' => $placementRequest->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_user_can_send_message()
    {
        Sanctum::actingAs($this->user);

        $chat = Chat::factory()->create();
        $chat->participants()->attach([
            $this->user->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
            $this->otherUser->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
        ]);

        $response = $this->postJson("/api/msg/chats/{$chat->id}/messages", [
            'content' => 'Test message',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.content', 'Test message');

        $this->assertDatabaseHas('chat_messages', [
            'chat_id' => $chat->id,
            'sender_id' => $this->user->id,
            'content' => 'Test message',
        ]);

        // Verify notification was created
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->otherUser->id,
            'type' => 'new_message',
        ]);
    }

    public function test_user_can_list_messages()
    {
        Sanctum::actingAs($this->user);

        $chat = Chat::factory()->create();
        $chat->participants()->attach([
            $this->user->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
            $this->otherUser->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
        ]);

        ChatMessage::factory()->count(5)->create([
            'chat_id' => $chat->id,
            'sender_id' => $this->otherUser->id,
        ]);

        $response = $this->getJson("/api/msg/chats/{$chat->id}/messages");

        $response->assertStatus(200)
            ->assertJsonCount(5, 'data.data');
    }

    public function test_user_can_mark_chat_as_read()
    {
        Sanctum::actingAs($this->user);

        $chat = Chat::factory()->create();
        $chat->participants()->attach([
            $this->user->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
            $this->otherUser->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
        ]);

        $response = $this->postJson("/api/msg/chats/{$chat->id}/read");

        $response->assertStatus(200);

        $this->assertNotNull(
            $chat->chatUsers()->where('user_id', $this->user->id)->first()->last_read_at
        );
    }

    public function test_user_can_get_unread_count()
    {
        Sanctum::actingAs($this->user);

        $chat = Chat::factory()->create();
        $chat->participants()->attach([
            $this->user->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
            $this->otherUser->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
        ]);

        ChatMessage::factory()->create([
            'chat_id' => $chat->id,
            'sender_id' => $this->otherUser->id,
            'created_at' => now()->subMinute(),
        ]);

        $response = $this->getJson('/api/msg/unread-count');

        $response->assertStatus(200)
            ->assertJsonPath('data.unread_message_count', 1);
    }

    public function test_user_can_leave_chat()
    {
        Sanctum::actingAs($this->user);

        $chat = Chat::factory()->create();
        $chat->participants()->attach([
            $this->user->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
            $this->otherUser->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
        ]);

        $response = $this->deleteJson("/api/msg/chats/{$chat->id}");

        $response->assertStatus(200);

        $this->assertNotNull(
            $chat->chatUsers()->where('user_id', $this->user->id)->first()->left_at
        );
    }

    public function test_unauthorized_user_cannot_view_chat()
    {
        $unauthorizedUser = User::factory()->create();
        Sanctum::actingAs($unauthorizedUser);

        $chat = Chat::factory()->create();
        $chat->participants()->attach([
            $this->user->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
            $this->otherUser->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
        ]);

        $response = $this->getJson("/api/msg/chats/{$chat->id}");

        $response->assertStatus(403);
    }
}
