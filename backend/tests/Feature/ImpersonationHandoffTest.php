<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Filament\Resources\UserResource\Actions\ImpersonateAsUser;
use App\Filament\Resources\UserResource\Pages\EditUser;
use App\Filament\Resources\UserResource\Pages\ListUsers;
use App\Models\ImpersonationAudit;
use App\Models\User;
use App\Services\Impersonation\ImpersonationHandoffService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Facades\Filament;
use Illuminate\Support\Facades\Auth;
use Livewire\Livewire;
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
    public function the_admin_panel_button_is_wired_to_the_handoff_action(): void
    {
        // Regression: the panel button was a bare STS Impersonate with
        // redirectTo('/'), while the handoff-aware subclass sat behind a
        // registration guarded on a namespace the users package had renamed. The
        // guard was silently false, so the subclass was never instantiated and
        // the button kept 403ing on the panel's own domain.
        $this->actingAs($this->admin);
        Filament::setCurrentPanel(Filament::getPanel('admin'));

        $action = Livewire::test(ListUsers::class)
            ->instance()
            ->getTable()
            ->getAction('impersonate');

        $this->assertInstanceOf(ImpersonateAsUser::class, $action);
    }

    #[Test]
    public function the_edit_page_button_is_wired_to_the_handoff_action_too(): void
    {
        // The edit page carries its own header action, built separately from the
        // table's. Fixing one and not the other leaves half the panel broken.
        $this->actingAs($this->admin);
        Filament::setCurrentPanel(Filament::getPanel('admin'));

        $page = Livewire::test(EditUser::class, ['record' => $this->target->getKey()]);

        $this->assertInstanceOf(ImpersonateAsUser::class, $page->instance()->getAction('impersonate'));

        // And it actually hands off, rather than merely being the right class.
        $page->callAction('impersonate');

        $audit = ImpersonationAudit::query()->sole();
        $this->assertSame($this->target->id, $audit->target_user_id);
        $page->assertRedirectContains(frontend_url().'/api/impersonation/enter?token=');
    }

    #[Test]
    public function leaving_returns_to_the_user_list_not_the_panel_root(): void
    {
        $this->actingAs($this->admin);
        Filament::setCurrentPanel(Filament::getPanel('admin'));

        ImpersonateAsUser::make()->impersonate($this->target);

        $backTo = ImpersonationAudit::query()->sole()->back_to;

        $this->assertNotNull($backTo);
        $this->assertStringEndsWith('/users', $backTo);
    }

    #[Test]
    public function the_panel_action_redirects_to_the_app_domain_and_never_enters_locally(): void
    {
        $this->actingAs($this->admin);

        $redirect = ImpersonateAsUser::make()->impersonate($this->target);

        $this->assertNotFalse($redirect);
        $this->assertStringStartsWith(
            frontend_url().'/api/impersonation/enter?token=',
            $redirect->getTargetUrl()
        );

        // The panel session must survive: enter() would have forgotten the admin.
        $this->assertAuthenticatedAs($this->admin);

        $this->assertSame(ImpersonationAudit::STATUS_ISSUED, ImpersonationAudit::query()->sole()->status);
    }

    #[Test]
    public function leaving_without_an_impersonation_is_rejected(): void
    {
        $this->actingAs($this->target, 'web');

        $this->postJson('/api/impersonation/leave')->assertStatus(400);
    }
}
