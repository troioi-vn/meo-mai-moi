<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PatExcludedBrowserSurfaceTest extends TestCase
{
    #[Test]
    public function bearer_tokens_cannot_call_browser_device_or_identity_plumbing(): void
    {
        $requests = [
            ['GET', '/api/email/verification-status'],
            ['GET', '/api/email/configuration-status'],
            ['POST', '/api/email/verification-notification'],
            ['POST', '/api/gpt-auth/confirm'],
            ['POST', '/api/mcp-auth/confirm'],
            ['POST', '/api/mcp-auth/deny'],
            ['GET', '/api/impersonation/status'],
            ['POST', '/api/impersonation/leave'],
            ['GET', '/api/user'],
            ['GET', '/api/push-subscriptions'],
            ['POST', '/api/push-subscriptions'],
            ['DELETE', '/api/push-subscriptions'],
            ['POST', '/api/notifications/{notification}/actions/test'],
            ['GET', '/api/telegram/status'],
            ['POST', '/api/telegram/link-miniapp'],
            ['POST', '/api/telegram/link-token'],
            ['DELETE', '/api/telegram/disconnect'],
            ['POST', '/api/telegram/test-notification'],
        ];

        foreach ($requests as [$method, $uri]) {
            $user = User::factory()->create();
            $token = $user->createToken('Excluded browser surface', ['*'])->plainTextToken;
            if (str_contains($uri, '{notification}')) {
                $notification = Notification::factory()->create(['user_id' => $user->id]);
                $uri = str_replace('{notification}', (string) $notification->id, $uri);
            }
            $this->app['auth']->forgetGuards();
            $response = $this->withToken($token)->json($method, $uri);
            $this->assertSame(403, $response->status(), "{$method} {$uri} accepted a bearer token");
            $response
                ->assertJsonPath('success', false)
                ->assertJsonPath('data', null);
        }
    }

    #[Test]
    public function session_users_keep_normal_telegram_status_and_disconnect_flows(): void
    {
        $user = User::factory()->create([
            'telegram_chat_id' => '123456',
            'telegram_user_id' => 123456,
        ]);

        $this->actingAs($user)
            ->getJson('/api/telegram/status')
            ->assertOk()
            ->assertJsonPath('data.is_connected', true);

        $this->actingAs($user)
            ->deleteJson('/api/telegram/disconnect')
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertNull($user->fresh()->telegram_chat_id);
        $this->assertNull($user->fresh()->telegram_user_id);
    }
}
