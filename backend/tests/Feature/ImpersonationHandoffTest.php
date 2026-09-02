<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ImpersonationAudit;
use App\Models\User;
use App\Services\Impersonation\ImpersonationHandoffService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Auth;
use PHPUnit\Framework\Attributes\Test;
use STS\FilamentImpersonate\ImpersonateManager;
use Tests\TestCase;

/**
 * The admin panel and the app answer on different registrable domains, so
 * impersonation crosses that gap on a single-use token instead of a cookie.
 */
class ImpersonationHandoffTest extends TestCase
{
    private User $admin;

    private User $target;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create(['name' => 'Admin User', 'email' => 'admin@example.com']);
        $this->admin->assignRole('admin');

        $this->target = User::factory()->create(['name' => 'Member User', 'email' => 'member@example.com']);
    }

    private function issue(): string
    {
        return app(ImpersonationHandoffService::class)->issue(
            $this->admin,
            $this->target,
            'https://admin.example.com/',
        )['token'];
    }

    #[Test]
    public function issuing_records_an_audit_row_without_storing_the_token(): void
    {
        $token = $this->issue();

        $audit = ImpersonationAudit::query()->sole();

        $this->assertSame(ImpersonationAudit::STATUS_ISSUED, $audit->status);
        $this->assertSame($this->admin->id, $audit->impersonator_user_id);
        $this->assertSame($this->target->id, $audit->target_user_id);
        $this->assertSame('member@example.com', $audit->target_email);
        $this->assertSame(hash('sha256', $token), $audit->token_hash);
        $this->assertStringNotContainsString($token, json_encode($audit->toArray(), JSON_THROW_ON_ERROR));
    }

    #[Test]
    public function consuming_the_token_signs_the_browser_in_as_the_target(): void
    {
        $response = $this->get('/api/impersonation/enter?token='.$this->issue());

        $response->assertRedirect('/');
        $this->assertAuthenticatedAs($this->target);

        $this->assertSame($this->admin->id, session(ImpersonateManager::SESSION_KEY));
        $this->assertSame('https://admin.example.com/', session('impersonate.back_to'));

        $audit = ImpersonationAudit::query()->sole();
        $this->assertSame(ImpersonationAudit::STATUS_CONSUMED, $audit->status);
        $this->assertNotNull($audit->consumed_at);
    }

    #[Test]
    public function the_impersonated_session_reports_status_to_the_spa(): void
    {
        $this->get('/api/impersonation/enter?token='.$this->issue());

        $this->getJson('/api/impersonation/status')
            ->assertOk()
            ->assertJsonPath('data.is_impersonating', true)
            ->assertJsonPath('data.impersonator.id', $this->admin->id)
            ->assertJsonPath('data.impersonator.can_access_admin', true)
            ->assertJsonPath('data.impersonated_user.id', $this->target->id);
    }

    #[Test]
    public function a_replayed_handoff_link_is_refused_and_leaves_the_successful_row_alone(): void
    {
        $token = $this->issue();

        $this->get('/api/impersonation/enter?token='.$token)->assertRedirect('/');

        Auth::logout();
        $this->flushSession();

        $this->get('/api/impersonation/enter?token='.$token)->assertForbidden();
        $this->assertGuest();

        $this->assertSame(ImpersonationAudit::STATUS_CONSUMED, ImpersonationAudit::query()->sole()->status);
    }

    #[Test]
    public function an_expired_token_is_refused_and_recorded_as_expired(): void
    {
        $token = $this->issue();

        $this->travel(config('impersonation.handoff_token_ttl_seconds') + 5)->seconds();

        $this->get('/api/impersonation/enter?token='.$token)->assertForbidden();
        $this->assertGuest();

        $audit = ImpersonationAudit::query()->sole();
        $this->assertSame(ImpersonationAudit::STATUS_EXPIRED, $audit->status);
        $this->assertSame('expired_token', $audit->rejection_reason);
    }

    #[Test]
    public function an_unknown_token_is_refused_without_an_audit_row(): void
    {
        $this->get('/api/impersonation/enter?token=not-a-real-token')->assertForbidden();

        $this->assertGuest();
        $this->assertSame(0, ImpersonationAudit::query()->count());
    }

    #[Test]
    public function capabilities_are_rechecked_at_consume_not_trusted_from_the_mint(): void
    {
        $token = $this->issue();

        // The target becomes an admin between minting and clicking.
        $this->target->assignRole('admin');

        $this->get('/api/impersonation/enter?token='.$token)->assertForbidden();
        $this->assertGuest();

        $audit = ImpersonationAudit::query()->sole();
        $this->assertSame(ImpersonationAudit::STATUS_REJECTED, $audit->status);
        $this->assertSame('target_not_allowed', $audit->rejection_reason);
    }

    #[Test]
    public function an_impersonator_who_lost_the_role_cannot_complete_the_handoff(): void
    {
        $token = $this->issue();

        $this->admin->removeRole('admin');

        $this->get('/api/impersonation/enter?token='.$token)->assertForbidden();
        $this->assertGuest();

        $this->assertSame('impersonator_not_allowed', ImpersonationAudit::query()->sole()->rejection_reason);
    }

    #[Test]
    public function leaving_logs_out_entirely_rather_than_restoring_the_admin(): void
    {
        $this->get('/api/impersonation/enter?token='.$this->issue());

        $response = $this->postJson('/api/impersonation/leave');

        $response->assertOk()
            ->assertJsonPath('data.back_to', 'https://admin.example.com/');

        // The whole point of the handoff: an admin session must never be left
        // standing on the public domain.
        $this->assertGuest();

        $this->assertSame(ImpersonationAudit::STATUS_LEFT, ImpersonationAudit::query()->sole()->status);
    }

    #[Test]
    public function leaving_without_an_impersonation_is_rejected(): void
    {
        $this->actingAs($this->target, 'web');

        $this->postJson('/api/impersonation/leave')->assertStatus(400);
    }
}
