<?php

namespace Tests\Unit;

use App\Models\Notification;
use App\Services\Notifications\WebPushDispatcher;
use Minishlink\WebPush\VAPID;
use ReflectionClass;
use ReflectionMethod;
use Tests\TestCase;

class WebPushDispatcherTest extends TestCase
{
    /**
     * The payload test below builds the dispatcher without its constructor, so nothing
     * else exercises the WebPush client construction. That is exactly where the library's
     * breaking changes land - v11 moved the constructor to PSR-18 - so cover it directly.
     */
    public function test_dispatcher_configures_a_web_push_client_when_vapid_keys_are_present(): void
    {
        $keys = VAPID::createVapidKeys();
        config()->set('services.vapid.public_key', $keys['publicKey']);
        config()->set('services.vapid.private_key', $keys['privateKey']);
        config()->set('services.vapid.subject', 'mailto:qa@example.com');

        $dispatcher = new WebPushDispatcher;
        $reflection = new ReflectionClass($dispatcher);

        $this->assertTrue($reflection->getProperty('isConfigured')->getValue($dispatcher));
        $this->assertNotNull($reflection->getProperty('webPush')->getValue($dispatcher));
    }

    public function test_dispatcher_stays_unconfigured_without_vapid_keys(): void
    {
        config()->set('services.vapid.public_key', null);
        config()->set('services.vapid.private_key', null);

        $dispatcher = new WebPushDispatcher;
        $reflection = new ReflectionClass($dispatcher);

        $this->assertFalse($reflection->getProperty('isConfigured')->getValue($dispatcher));
        $this->assertNull($reflection->getProperty('webPush')->getValue($dispatcher));
    }

    public function test_build_payload_includes_app_metadata(): void
    {
        config()->set('app.name', 'Meo Mai Moi QA');
        config()->set('app.push_icon', '/brand/icon.png');
        config()->set('app.push_badge', 'brand/badge.png');

        $notification = new Notification;
        $notification->forceFill([
            'id' => 42,
            'message' => 'Test notification body',
            'type' => 'system_announcement',
            'data' => [
                'channel' => 'in_app',
                'title' => 'Custom title',
            ],
        ]);
        $notification->setAttribute('created_at', now());

        $dispatcher = (new ReflectionClass(WebPushDispatcher::class))->newInstanceWithoutConstructor();
        $method = new ReflectionMethod(WebPushDispatcher::class, 'buildPayload');
        $method->setAccessible(true);

        $payload = $method->invoke($dispatcher, $notification);
        $decoded = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);

        $this->assertEquals('Custom title', $decoded['title']);
        $this->assertEquals('/brand/icon.png', $decoded['icon']);
        $this->assertEquals('/brand/icon.png', $decoded['data']['app']['icon']);
        $this->assertEquals('/brand/badge.png', $decoded['badge']);
        $this->assertEquals('/brand/badge.png', $decoded['data']['app']['badge']);
        $this->assertEquals('Meo Mai Moi QA', $decoded['data']['app']['name']);
    }
}
