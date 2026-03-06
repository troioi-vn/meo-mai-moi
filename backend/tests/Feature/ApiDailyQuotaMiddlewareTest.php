<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Settings;
use App\Models\User;
use Carbon\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ApiDailyQuotaMiddlewareTest extends TestCase
{
    #[Test]
    public function regular_user_hits_daily_quota_and_gets_429_response(): void
    {
        Settings::set('api_daily_quota_regular', '2');
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/users/me')->assertOk();
        $this->actingAs($user)->getJson('/api/users/me')->assertOk();

        $this->actingAs($user)
            ->getJson('/api/users/me')
            ->assertStatus(429)
            ->assertJsonPath('success', false)
            ->assertJsonPath('data.error_code', 'API_DAILY_QUOTA_EXCEEDED');
    }

    #[Test]
    public function premium_user_is_not_limited_by_daily_quota(): void
    {
        Settings::set('api_daily_quota_regular', '1');

        Role::firstOrCreate(['name' => 'premium', 'guard_name' => 'web']);

        $user = User::factory()->create();
        $user->assignRole('premium');

        $this->actingAs($user)->getJson('/api/users/me')->assertOk();
        $this->actingAs($user)->getJson('/api/users/me')->assertOk();
    }

    #[Test]
    public function quota_resets_on_utc_day_boundary(): void
    {
        Settings::set('api_daily_quota_regular', '1');
        $user = User::factory()->create();

        Carbon::setTestNow(Carbon::parse('2026-03-05 23:59:58', 'UTC'));

        $this->actingAs($user)->getJson('/api/users/me')->assertOk();
        $this->actingAs($user)->getJson('/api/users/me')->assertStatus(429);

        Carbon::setTestNow(Carbon::parse('2026-03-06 00:00:01', 'UTC'));

        $this->actingAs($user)->getJson('/api/users/me')->assertOk();

        Carbon::setTestNow();
    }
}
