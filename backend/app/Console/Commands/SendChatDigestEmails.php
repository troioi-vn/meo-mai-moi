<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\NotificationType;
use App\Models\Chat;
use App\Models\ChatUser;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendChatDigestEmails extends Command
{
    protected $signature = 'chat:send-digest-emails';

    protected $description = 'Send batched chat digest emails for unread messages';

    public function handle(): int
    {
        $this->info('Scanning for unread chat messages to digest...');

        $service = app(NotificationService::class);
        $sentCount = 0;

        // Find chat_users with unread messages that haven't been digested recently
        ChatUser::query()
            ->whereNull('left_at')
            ->select('user_id')
            ->distinct()
            ->orderBy('user_id')
            ->chunk(100, function ($rows) use (&$sentCount, $service): void {
                $userIds = $rows->pluck('user_id')->filter()->values();
                if ($userIds->isEmpty()) {
                    return;
                }

                $chatUsers = ChatUser::query()
                    ->whereNull('left_at')
                    ->whereIn('user_id', $userIds)
                    ->with(['user', 'chat'])
                    ->get();

                // Group by user to send one digest per user
                /** @var array<int, array{user: User, chats: list<array{chat_id: int, sender_name: string, count: int, preview: string}>, total_messages: int, chat_user_ids: list<int>}> $byUser */
                $byUser = [];

                foreach ($chatUsers as $chatUser) {
                    /** @var ChatUser $chatUser */
                    if (! $chatUser->user || ! $chatUser->chat) {
                        continue;
                    }

                    /** @var Chat $chat */
                    $chat = $chatUser->chat;

                    /** @var User $chatOwner */
                    $chatOwner = $chatUser->user;

                    // Count unread messages since the later of last digest and last read
                    $sinceDigest = $chatUser->last_email_digest_at;
                    $sinceRead = $chatUser->last_read_at;
                    $since = null;

                    if ($sinceDigest && $sinceRead) {
                        $since = $sinceDigest->greaterThan($sinceRead) ? $sinceDigest : $sinceRead;
                    } else {
                        $since = $sinceDigest ?: $sinceRead;
                    }

                    $unreadQuery = $chat->messages()
                        ->where('sender_id', '!=', $chatUser->user_id);

                    if ($since) {
                        $unreadQuery->where('created_at', '>', $since);
                    }

                    $unreadCount = $unreadQuery->count();
                    if ($unreadCount === 0) {
                        continue;
                    }

                    // Get latest message preview
                    $latestMessage = $unreadQuery->latest()->first();

                    // Get sender name from the other participant
                    /** @var User|null $otherParticipant */
                    $otherParticipant = $chat->activeParticipants()
                        ->where('user_id', '!=', $chatUser->user_id)
                        ->first();

                    $senderName = $otherParticipant
                        ? $otherParticipant->name
                        : __('messages.emails.common.someone');

                    $userId = $chatUser->user_id;
                    if (! isset($byUser[$userId])) {
                        $byUser[$userId] = [
                            'user' => $chatOwner,
                            'chats' => [],
                            'total_messages' => 0,
                            'chat_user_ids' => [],
                        ];
                    }

                    $preview = $latestMessage->content ?? '';
                    if ($latestMessage && $latestMessage->type->value === 'image') {
                        $preview = __('messages.image_preview');
                    }

                    $byUser[$userId]['chats'][] = [
                        'chat_id' => $chatUser->chat_id,
                        'sender_name' => $senderName,
                        'count' => $unreadCount,
                        'preview' => mb_substr($preview, 0, 100),
                    ];
                    $byUser[$userId]['total_messages'] += $unreadCount;
                    $byUser[$userId]['chat_user_ids'][] = $chatUser->id;
                }

                // Send digest notifications for each user (one digest payload per user_id)
                foreach ($byUser as $entry) {
                    $preferences = NotificationPreference::getPreference(
                        $entry['user'],
                        NotificationType::CHAT_DIGEST->value
                    );

                    // Respect user opt-outs before attempting sends
                    if (! $preferences->email_enabled && ! $preferences->telegram_enabled && ! $preferences->in_app_enabled) {
                        continue;
                    }

                    $data = [
                        'message' => __('messages.emails.chat_digest.intro', ['count' => $entry['total_messages']]),
                        'link' => '/messages',
                        'total_messages' => $entry['total_messages'],
                        'chats_summary' => $entry['chats'],
                    ];

                    $emailSent = false;
                    $telegramSent = false;
                    $inAppSent = false;

                    if ($preferences->email_enabled) {
                        $emailSent = $service->sendEmail(
                            $entry['user'],
                            NotificationType::CHAT_DIGEST->value,
                            $data
                        );
                    }

                    if ($preferences->telegram_enabled) {
                        $telegramSent = $service->sendTelegram(
                            $entry['user'],
                            NotificationType::CHAT_DIGEST->value,
                            $data
                        );
                    }

                    if ($preferences->in_app_enabled) {
                        $inAppSent = $service->sendInApp(
                            $entry['user'],
                            NotificationType::CHAT_DIGEST->value,
                            $data
                        );
                    }

                    if (! $emailSent && ! $telegramSent && ! $inAppSent) {
                        continue;
                    }

                    // Update last_email_digest_at when at least one digest channel was sent successfully
                    ChatUser::whereIn('id', $entry['chat_user_ids'])
                        ->update(['last_email_digest_at' => now()]);

                    $sentCount++;
                }
            });

        $this->info("Sent {$sentCount} chat digest notification(s).");
        Log::info('Chat digest notification job completed', ['count' => $sentCount]);

        return Command::SUCCESS;
    }
}
