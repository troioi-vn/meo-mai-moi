<?php

namespace App\Services\Notifications;

use App\Models\Notification;
use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use JsonException;
use Minishlink\WebPush\Subscription as WebPushSubscription;
use Minishlink\WebPush\WebPush;

class WebPushDispatcher
{
    private ?WebPush $webPush = null;
    private bool $isConfigured = false;

    public function __construct()
    {
        $config = config('services.vapid');
        if (
            empty($config['public_key'])
            || empty($config['private_key'])
        ) {
            return;
        }

        $this->webPush = new WebPush([
            'VAPID' => [
                'subject' => $config['subject'] ?? config('app.url'),
                'publicKey' => $config['public_key'],
                'privateKey' => $config['private_key'],
            ],
        ]);

        $this->webPush->setAutomaticPadding(0);
        $this->isConfigured = true;
    }

    public function dispatch(User $user, Notification $notification): void
    {
        if (! $this->isConfigured || $this->webPush === null) {
            return;
        }

        $subscriptions = $user->pushSubscriptions()->get();
        if ($subscriptions->isEmpty()) {
            return;
        }

        $payload = $this->buildPayload($notification);

        $this->queueNotifications($subscriptions, $payload);
        $this->flushQueue($subscriptions);
    }

    private function buildPayload(Notification $notification): string
    {
        $data = $notification->data ?? [];

        $title = $data['title'] ?? $data['subject'] ?? ($data['message'] ?? $notification->message ?? 'Notification');

        $body = $data['body'] ?? $data['message'] ?? $notification->message ?? null;
        $url = $data['url'] ?? $notification->link ?? $data['actionUrl'] ?? null;

        $payload = [
            'title' => $title,
            'body' => $body,
            'tag' => (string) $notification->id,
            'data' => array_filter([
                'url' => $url,
                'notification_id' => (string) $notification->id,
                'type' => $notification->type,
            ]),
        ];

        try {
            return json_encode($payload, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            Log::warning('Unable to encode web push payload', [
                'notification_id' => $notification->id,
                'error' => $e->getMessage(),
            ]);

            $fallback = ['title' => $title];
            if ($body !== null) {
                $fallback['body'] = $body;
            }

            return json_encode($fallback) ?: '{"title":"'.$title.'"}';
        }
    }

    /**
     * @param  Collection<int, PushSubscription>  $subscriptions
     */
    private function queueNotifications(Collection $subscriptions, string $payload): void
    {
        foreach ($subscriptions as $subscription) {
            $this->webPush?->queueNotification(
                WebPushSubscription::create([
                    'endpoint' => $subscription->endpoint,
                    'publicKey' => $subscription->p256dh,
                    'authToken' => $subscription->auth,
                    'contentEncoding' => $subscription->content_encoding,
                ]),
                $payload
            );
        }
    }

    private function flushQueue(Collection $subscriptions): void
    {
        if ($this->webPush === null) {
            return;
        }

        foreach ($this->webPush->flush() as $report) {
            $endpoint = $report->getEndpoint();

            if ($report->isSuccess()) {
                $this->markSubscriptionAsSeen($subscriptions, $endpoint);
                continue;
            }

            $reason = $report->getReason() ?? 'Unknown error';
            Log::warning('Web push delivery failed', [
                'endpoint' => $endpoint,
                'reason' => $reason,
            ]);

            if ($report->isSubscriptionExpired()) {
                $this->expireSubscription($subscriptions, $endpoint);
            }
        }
    }

    private function markSubscriptionAsSeen(Collection $subscriptions, string $endpoint): void
    {
        $subscription = $subscriptions->firstWhere('endpoint', $endpoint);
        if (! $subscription) {
            $subscription = PushSubscription::query()->where('endpoint', $endpoint)->first();
        }

        if (! $subscription) {
            return;
        }

        $subscription->forceFill(['last_seen_at' => now()])->save();
    }

    private function expireSubscription(Collection $subscriptions, string $endpoint): void
    {
        $subscription = $subscriptions->firstWhere('endpoint', $endpoint);
        if (! $subscription) {
            $subscription = PushSubscription::query()->where('endpoint', $endpoint)->first();
        }

        if (! $subscription) {
            return;
        }

        $subscription->delete();
    }
}

