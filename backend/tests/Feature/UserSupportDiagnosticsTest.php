<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Filament\Resources\EmailLogResource;
use App\Filament\Resources\UserResource;
use App\Filament\Resources\UserResource\Pages\ViewUser;
use App\Filament\Resources\UserResource\RelationManagers\PushSubscriptionsRelationManager;
use App\Models\PushSubscription;
use App\Models\User;
use App\Services\TelegramAccountService;
use Illuminate\Support\Facades\Auth;
use Livewire\Livewire;
use Tests\TestCase;

class UserSupportDiagnosticsTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
        $this->actingAs($this->admin);
    }

    public function test_user_diagnostics_render_without_exposing_telegram_tokens(): void
    {
        $user = User::factory()->create([
            'is_banned' => true,
            'banned_at' => now(),
            'ban_reason' => 'Chargeback investigation',
            'telegram_chat_id' => '123456',
            'telegram_user_id' => 987654,
            'telegram_username' => 'linked_user',
            'telegram_link_token' => 'support-must-not-see-this-token',
        ]);

        $this->get(UserResource::getUrl('view', ['record' => $user]))
            ->assertSuccessful()
            ->assertSee('Account Restrictions')
            ->assertSee('Chargeback investigation')
            ->assertSee('Telegram Linkage')
            ->assertSee('@linked_user')
            ->assertDontSee('support-must-not-see-this-token');
    }

    public function test_telegram_disconnect_clears_linkage_without_changing_admin_authentication(): void
    {
        $user = User::factory()->create([
            'telegram_chat_id' => '123456',
            'telegram_user_id' => 987654,
            'telegram_username' => 'compromised',
            'telegram_first_name' => 'Compromised',
            'telegram_last_name' => 'Account',
            'telegram_photo_url' => 'https://example.com/avatar.jpg',
            'telegram_link_token' => 'pending-token',
            'telegram_link_token_expires_at' => now()->addHour(),
            'telegram_last_authenticated_at' => now(),
        ]);

        app(TelegramAccountService::class)->disconnect($user);
        $user->refresh();

        $this->assertSame($this->admin->id, Auth::id());
        $this->assertNull($user->telegram_chat_id);
        $this->assertNull($user->telegram_user_id);
        $this->assertNull($user->telegram_username);
        $this->assertNull($user->telegram_first_name);
        $this->assertNull($user->telegram_last_name);
        $this->assertNull($user->telegram_photo_url);
        $this->assertNull($user->telegram_link_token);
        $this->assertNull($user->telegram_link_token_expires_at);
        $this->assertNull($user->telegram_last_authenticated_at);
    }

    public function test_push_diagnostics_mask_secrets_and_only_mark_inactive_records_stale(): void
    {
        $user = User::factory()->create();
        $active = PushSubscription::factory()->create([
            'user_id' => $user->id,
            'endpoint' => 'https://push.example.test/private/device-token',
            'endpoint_hash' => PushSubscription::hashEndpoint('https://push.example.test/private/device-token'),
            'p256dh' => 'public-material-123456',
            'auth' => 'private-auth-654321',
            'last_seen_at' => now()->subDay(),
        ]);
        $stale = PushSubscription::factory()->create([
            'user_id' => $user->id,
            'last_seen_at' => now()->subDays(PushSubscription::STALE_AFTER_DAYS + 1),
        ]);

        $this->assertFalse($active->isStale());
        $this->assertTrue($stale->isStale());
        $this->assertSame('healthy', $active->health_status);
        $this->assertStringNotContainsString('device-token', $active->masked_endpoint);
        $this->assertStringNotContainsString('public-material', $active->masked_p256dh);
        $this->assertStringNotContainsString('private-auth', $active->masked_auth);

        Livewire::test(PushSubscriptionsRelationManager::class, [
            'ownerRecord' => $user,
            'pageClass' => ViewUser::class,
        ])
            ->assertCanSeeTableRecords([$active, $stale])
            ->assertSee($active->masked_endpoint)
            ->assertDontSee('private/device-token');

        $this->assertFalse($active->removeIfStale());
        $this->assertTrue($stale->removeIfStale());
        $this->assertModelExists($active);
        $this->assertModelMissing($stale);
    }

    public function test_email_logs_are_discoverable_under_operations(): void
    {
        $this->assertTrue(EmailLogResource::shouldRegisterNavigation());
        $this->assertSame('Operations', EmailLogResource::getNavigationGroup());
    }
}
