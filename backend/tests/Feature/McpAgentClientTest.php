<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\McpAgentClient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class McpAgentClientTest extends TestCase
{
    use RefreshDatabase;

    private const API_KEY = 'test-mcp-api-key';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.mcp_connector.url' => 'https://mcp.example.test',
            'services.mcp_connector.api_key' => self::API_KEY,
            'services.mcp_connector.hmac_secret' => 'test-mcp-hmac-secret',
            'services.mcp_connector.agent_clients_enabled' => true,
        ]);
    }

    /** @return array{client_id:string, secret:string, id:int} */
    private function createClient(User $user, array $scopes = ['pets:read'], ?int $days = null): array
    {
        $response = $this->actingAs($user)->postJson('/api/user/mcp-agent-clients', [
            'name' => 'Hub agent',
            'scopes' => $scopes,
            'expires_in_days' => $days,
        ]);
        $response->assertCreated();

        return [
            'client_id' => (string) $response->json('data.client.client_id'),
            'secret' => (string) $response->json('data.client_secret'),
            'id' => (int) $response->json('data.client.id'),
        ];
    }

    private function issue(string $clientId, string $secret, ?array $scopes = null): TestResponse
    {
        $body = ['client_id' => $clientId, 'client_secret' => $secret];
        if ($scopes !== null) {
            $body['scopes'] = $scopes;
        }

        $response = $this->withToken(self::API_KEY)->postJson('/api/mcp-auth/agent-token', $body);
        $this->withoutToken();

        return $response;
    }

    public function test_user_creates_client_and_gateway_trades_secret_for_short_lived_token(): void
    {
        $user = User::factory()->create();
        $created = $this->createClient($user, ['pets:read', 'health:read']);

        $this->assertStringStartsWith('meo_agent_', $created['secret']);
        $this->assertStringStartsWith('meo_ac_', $created['client_id']);
        $this->assertNotSame($created['secret'], McpAgentClient::firstOrFail()->secret_hash);

        $issued = $this->issue($created['client_id'], $created['secret']);
        $issued->assertOk()
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.scopes', ['pets:read', 'health:read']);

        $plain = (string) $issued->json('data.sanctum_token');
        $token = PersonalAccessToken::findToken($plain);
        $this->assertNotNull($token);
        $this->assertSame(['pets:read', 'health:read'], $token->abilities);
        $this->assertTrue($token->expires_at->between(now()->addMinutes(59), now()->addMinutes(61)));
        $this->assertNotNull(McpAgentClient::firstOrFail()->last_used_at);

        $this->withToken($plain)->getJson('/api/my-pets')->assertOk();
    }

    public function test_list_never_returns_secrets_and_hides_agent_tokens_from_api_tokens(): void
    {
        $user = User::factory()->create();
        $created = $this->createClient($user);
        $this->issue($created['client_id'], $created['secret'])->assertOk();

        $list = $this->actingAs($user)->getJson('/api/user/mcp-agent-clients');
        $list->assertOk()
            ->assertJsonPath('data.enabled', true)
            ->assertJsonPath('data.clients.0.client_id', $created['client_id'])
            ->assertJsonMissingPath('data.clients.0.secret_hash');
        $this->assertStringNotContainsString($created['secret'], $list->getContent());

        $this->actingAs($user)->getJson('/api/user/api-tokens')
            ->assertOk()
            ->assertJsonCount(0, 'data.tokens');
    }

    public function test_wrong_secret_unknown_client_and_missing_connector_key_are_refused(): void
    {
        $user = User::factory()->create();
        $created = $this->createClient($user);

        $this->issue($created['client_id'], 'meo_agent_wrong')->assertStatus(401)->assertJsonPath('message', 'invalid_client');
        $this->issue('meo_ac_unknown', $created['secret'])->assertStatus(401)->assertJsonPath('message', 'invalid_client');
        $this->postJson('/api/mcp-auth/agent-token', [
            'client_id' => $created['client_id'],
            'client_secret' => $created['secret'],
        ])->assertStatus(401);
        $this->assertSame(0, PersonalAccessToken::count());
    }

    public function test_requested_scopes_must_be_a_subset(): void
    {
        $user = User::factory()->create();
        $created = $this->createClient($user, ['pets:read', 'health:read']);

        $this->issue($created['client_id'], $created['secret'], ['pets:read'])
            ->assertOk()
            ->assertJsonPath('data.scopes', ['pets:read']);
        $this->issue($created['client_id'], $created['secret'], ['pets:write'])
            ->assertStatus(400)
            ->assertJsonPath('message', 'invalid_scope');
    }

    public function test_revoking_deletes_client_and_its_tokens(): void
    {
        $user = User::factory()->create();
        $created = $this->createClient($user);
        $plain = (string) $this->issue($created['client_id'], $created['secret'])->json('data.sanctum_token');

        $this->actingAs($user)->deleteJson('/api/user/mcp-agent-clients/'.$created['id'])->assertOk();

        $this->assertNull(PersonalAccessToken::findToken($plain));
        $this->issue($created['client_id'], $created['secret'])->assertStatus(401);
    }

    public function test_user_cannot_revoke_someone_elses_client(): void
    {
        $owner = User::factory()->create();
        $created = $this->createClient($owner);

        $this->actingAs(User::factory()->create())
            ->deleteJson('/api/user/mcp-agent-clients/'.$created['id'])
            ->assertNotFound();
        $this->assertSame(1, McpAgentClient::count());
    }

    public function test_expired_client_is_refused_and_token_never_outlives_client(): void
    {
        $user = User::factory()->create();
        $created = $this->createClient($user, days: 30);
        $client = McpAgentClient::firstOrFail();

        $client->forceFill(['expires_at' => now()->addMinutes(10)])->save();
        $token = PersonalAccessToken::findToken((string) $this->issue($created['client_id'], $created['secret'])->json('data.sanctum_token'));
        $this->assertTrue($token->expires_at->lessThanOrEqualTo(now()->addMinutes(10)));

        Carbon::setTestNow(now()->addMinutes(11));
        $this->issue($created['client_id'], $created['secret'])->assertStatus(401);
        Carbon::setTestNow();
    }

    public function test_banned_and_unverified_accounts_cannot_create_or_use_clients(): void
    {
        $unverified = User::factory()->unverified()->create();
        $this->actingAs($unverified)->postJson('/api/user/mcp-agent-clients', [
            'name' => 'x', 'scopes' => ['pets:read'],
        ])->assertForbidden();

        $user = User::factory()->create();
        $created = $this->createClient($user);
        $user->forceFill(['is_banned' => true])->save();
        $this->issue($created['client_id'], $created['secret'])->assertStatus(401);
    }

    public function test_feature_flag_off_blocks_creation_and_exchange(): void
    {
        $user = User::factory()->create();
        $created = $this->createClient($user);
        config(['services.mcp_connector.agent_clients_enabled' => false]);

        $this->actingAs($user)->getJson('/api/user/mcp-agent-clients')->assertOk()->assertJsonPath('data.enabled', false);
        $this->actingAs($user)->postJson('/api/user/mcp-agent-clients', [
            'name' => 'x', 'scopes' => ['pets:read'],
        ])->assertForbidden();
        $this->issue($created['client_id'], $created['secret'])->assertStatus(401);
    }

    public function test_unknown_scopes_and_pat_callers_are_rejected(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/user/mcp-agent-clients', [
            'name' => 'x', 'scopes' => ['admin:everything'],
        ])->assertUnprocessable();

        $pat = $user->createToken('cli', ['read'])->plainTextToken;
        $this->app['auth']->forgetGuards();
        $this->withToken($pat)->postJson('/api/user/mcp-agent-clients', [
            'name' => 'x', 'scopes' => ['pets:read'],
        ])->assertForbidden();
    }
}
