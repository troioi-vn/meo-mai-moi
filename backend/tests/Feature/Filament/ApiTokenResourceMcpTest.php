<?php

declare(strict_types=1);

namespace Tests\Feature\Filament;

use App\Filament\Resources\ApiTokenResource\Pages\ListApiTokens;
use App\Models\ApiTokenRevocationAudit;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Livewire\Livewire;
use Tests\TestCase;

class ApiTokenResourceMcpTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->owner = User::factory()->create();

        $this->actingAs($this->admin);
    }

    private function makeToken(string $name): PersonalAccessToken
    {
        return $this->owner->createToken($name, ['pets:read'])->accessToken;
    }

    public function test_source_column_distinguishes_mcp_and_manual_tokens(): void
    {
        $mcp = $this->makeToken('mcp:Acme Assistant');
        $manual = $this->makeToken('My Laptop Key');

        Livewire::test(ListApiTokens::class)
            ->assertSuccessful()
            ->assertTableColumnExists('source')
            ->assertCanRenderTableColumn('source')
            ->assertTableColumnStateSet('source', 'MCP', $mcp)
            ->assertTableColumnStateSet('source', 'Manual', $manual)
            ->assertTableColumnHasDescription('source', 'Acme Assistant', $mcp)
            ->assertTableColumnDoesNotHaveDescription('source', 'Acme Assistant', $manual);
    }

    public function test_source_column_handles_empty_client_suffix(): void
    {
        $empty = $this->makeToken('mcp:');

        Livewire::test(ListApiTokens::class)
            ->assertSuccessful()
            ->assertTableColumnStateSet('source', 'MCP', $empty)
            ->assertTableColumnHasDescription('source', 'Unknown client', $empty);
    }

    public function test_mcp_issued_filter_matches_exact_prefix_only(): void
    {
        $mcp = $this->makeToken('mcp:Acme Assistant');
        $emptySuffix = $this->makeToken('mcp:');
        $manual = $this->makeToken('My Laptop Key');
        $lookalikePrefix = $this->makeToken('xmcp:client');
        $laterInName = $this->makeToken('my mcp: key');

        Livewire::test(ListApiTokens::class)
            ->assertSuccessful()
            ->assertTableFilterExists('mcp_issued')
            ->filterTable('mcp_issued', true)
            ->assertCanSeeTableRecords([$mcp, $emptySuffix])
            ->assertCanNotSeeTableRecords([$manual, $lookalikePrefix, $laterInName])
            ->filterTable('mcp_issued', false)
            ->assertCanSeeTableRecords([$manual, $lookalikePrefix, $laterInName])
            ->assertCanNotSeeTableRecords([$mcp, $emptySuffix])
            ->resetTableFilters()
            ->assertCanSeeTableRecords([$mcp, $emptySuffix, $manual, $lookalikePrefix, $laterInName]);
    }

    public function test_revoke_action_still_audits_mcp_tokens(): void
    {
        $mcp = $this->makeToken('mcp:Acme Assistant');

        Livewire::test(ListApiTokens::class)
            ->assertSuccessful()
            ->assertTableActionExists('revoke')
            ->callTableAction('revoke', $mcp->getKey());

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $mcp->id]);
        $this->assertDatabaseHas('api_token_revocation_audits', [
            'token_id' => $mcp->id,
            'token_name' => 'mcp:Acme Assistant',
            'source' => 'admin_panel',
            'actor_user_id' => $this->admin->id,
            'target_user_id' => $this->owner->id,
        ]);

        $audit = ApiTokenRevocationAudit::query()->where('token_id', $mcp->getKey())->first();
        $this->assertNotNull($audit);
        $this->assertSame(['pets:read'], $audit->token_abilities);
    }

    public function test_no_credential_columns_are_exposed(): void
    {
        Livewire::test(ListApiTokens::class)
            ->assertSuccessful()
            ->assertTableColumnDoesNotExist('token')
            ->assertTableColumnDoesNotExist('plain_text_token')
            ->assertTableColumnDoesNotExist('exchange_code')
            ->assertTableColumnDoesNotExist('api_key')
            ->assertTableColumnDoesNotExist('hmac_secret');
    }
}
