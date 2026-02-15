<?php

namespace Tests\Feature;

use App\Enums\ChatUserRole;
use App\Mail\ChatDigestMail;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\EmailConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ChatDigestCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => true,
            'config' => [
                'host' => 'smtp.example.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password',
                'encryption' => 'tls',
                'from_address' => 'noreply@test.com',
                'from_name' => 'Meo Mai Moi',
            ],
        ]);
    }

    public function test_it_sends_chat_digest_emails_to_users_with_unread_messages()
    {
        Mail::fake();

        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $chat = Chat::factory()->create();
        $chat->participants()->attach([
            $user->id => [
                'role' => ChatUserRole::MEMBER,
                'joined_at' => now(),
                'last_email_digest_at' => null,
            ],
            $otherUser->id => [
                'role' => ChatUserRole::MEMBER,
                'joined_at' => now(),
                'last_email_digest_at' => null,
            ],
        ]);

        // Create 3 unread messages for $user
        ChatMessage::factory()->count(3)->create([
            'chat_id' => $chat->id,
            'sender_id' => $otherUser->id,
        ]);

        // Run the command
        $this->artisan('chat:send-digest-emails')
            ->assertSuccessful()
            ->expectsOutputToContain('Sent 1 chat digest notification(s).');

        // Verify email was sent
        Mail::assertSent(ChatDigestMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email) &&
                   $mail->getNotificationData()['total_messages'] === 3;
        });

        // Verify last_email_digest_at was updated
        $this->assertNotNull(
            $chat->chatUsers()->where('user_id', $user->id)->first()->last_email_digest_at
        );
    }

    public function test_it_does_not_send_digest_if_no_new_messages_since_last_digest()
    {
        Mail::fake();

        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $chat = Chat::factory()->create();
        $chat->participants()->attach([
            $user->id => [
                'role' => ChatUserRole::MEMBER,
                'joined_at' => now(),
                'last_email_digest_at' => now()->subMinutes(10),
            ],
            $otherUser->id => [
                'role' => ChatUserRole::MEMBER,
                'joined_at' => now(),
                'last_email_digest_at' => null,
            ],
        ]);

        // Create a message BEFORE the last digest
        ChatMessage::factory()->create([
            'chat_id' => $chat->id,
            'sender_id' => $otherUser->id,
            'created_at' => now()->subMinutes(20),
        ]);

        $this->artisan('chat:send-digest-emails')
            ->assertSuccessful()
            ->expectsOutputToContain('Sent 0 chat digest notification(s).');

        Mail::assertNothingSent();
    }

    public function test_it_groups_multiple_chats_into_one_digest_email()
    {
        Mail::fake();

        $user = User::factory()->create();
        $sender1 = User::factory()->create(['name' => 'Sender One']);
        $sender2 = User::factory()->create(['name' => 'Sender Two']);

        // Chat 1
        $chat1 = Chat::factory()->create();
        $chat1->participants()->attach([
            $user->id => [
                'role' => ChatUserRole::MEMBER,
                'joined_at' => now(),
            ],
            $sender1->id => [
                'role' => ChatUserRole::MEMBER,
                'joined_at' => now(),
            ],
        ]);
        ChatMessage::factory()->count(2)->create([
            'chat_id' => $chat1->id,
            'sender_id' => $sender1->id,
        ]);

        // Chat 2
        $chat2 = Chat::factory()->create();
        $chat2->participants()->attach([
            $user->id => [
                'role' => ChatUserRole::MEMBER,
                'joined_at' => now(),
            ],
            $sender2->id => [
                'role' => ChatUserRole::MEMBER,
                'joined_at' => now(),
            ],
        ]);
        ChatMessage::factory()->count(1)->create([
            'chat_id' => $chat2->id,
            'sender_id' => $sender2->id,
        ]);

        $this->artisan('chat:send-digest-emails')
            ->assertSuccessful()
            ->expectsOutputToContain('Sent 1 chat digest notification(s).');

        Mail::assertSent(ChatDigestMail::class, function ($mail) use ($user) {
            $data = $mail->getNotificationData();

            return $mail->hasTo($user->email) &&
                   $data['total_messages'] === 3 &&
                   count($data['chats_summary']) === 2;
        });
    }
}
