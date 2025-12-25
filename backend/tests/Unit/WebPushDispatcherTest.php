<?php

namespace Tests\Unit;

use App\Models\Notification;
use App\Services\Notifications\WebPushDispatcher;
use ReflectionClass;
use ReflectionMethod;
use Tests\TestCase;

class WebPushDispatcherTest extends TestCase
{
    public function test_build_payload_includes_app_metadata(): void
    {
        config()->set('app.name', 'Meo Mai Moi QA');
        config()->set('app.push_icon', '/brand/icon.png');
        config()->set('app.push_badge', 'brand/badge.png');

        $notification = new Notification();
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
