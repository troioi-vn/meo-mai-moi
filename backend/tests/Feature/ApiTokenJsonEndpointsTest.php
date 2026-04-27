<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ApiTokenRevocationAudit;
use App\Models\User;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiTokenJsonEndpointsTest extends TestCase
{
    #[Test]
    public function user_can_list_create_update_and_revoke_tokens_via_json_api(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/user/api-tokens')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.default_permissions', ['read'])
            ->assertJsonPath('data.available_permissions', [
                'pet:read',
                'pet:write',
                'health:read',
                'health:write',
                'profile:read',
                'create',
                'read',
                'update',
                'delete',
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'tokens',
                    'available_permissions',
                    'default_permissions',
                ],
            ]);

        $create = $this->actingAs($user)->postJson('/api/user/api-tokens', [
            'name' => 'Connector Token',
            'permissions' => ['pet:read', 'read', 'update'],
        ]);

        $create
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'token' => ['id', 'name', 'abilities'],
                    'plain_text_token',
                ],
            ]);

        $tokenId = (int) $create->json('data.token.id');
        $this->assertSame(['pet:read', 'read', 'update'], $create->json('data.token.abilities'));

        $this->actingAs($user)
            ->postJson('/api/user/api-tokens', [
                'name' => 'Connector Token',
                'permissions' => ['read'],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name']);

        $this->actingAs($user)
            ->putJson("/api/user/api-tokens/{$tokenId}", [
                'permissions' => ['delete', 'missing-permission'],
            ])
            ->assertOk()
            ->assertJsonPath('data.token.abilities.0', 'delete');

        $this->actingAs($user)
            ->deleteJson("/api/user/api-tokens/{$tokenId}")
            ->assertOk()
            ->assertJsonPath('data.revoked', true);

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $tokenId,
        ]);

        $this->assertDatabaseHas('api_token_revocation_audits', [
            'token_id' => $tokenId,
            'source' => 'self_service_api',
            'actor_user_id' => $user->id,
            'target_user_id' => $user->id,
        ]);

        $audit = ApiTokenRevocationAudit::query()
            ->where('token_id', $tokenId)
            ->latest('id')
            ->first();

        $this->assertNotNull($audit);
        $this->assertSame('self_service_api', $audit->source);
        $this->assertSame($user->id, $audit->actor_user_id);
        $this->assertSame($user->id, $audit->target_user_id);
        $this->assertIsArray($audit->metadata);
        $this->assertArrayHasKey('ip', $audit->metadata);
        $this->assertArrayHasKey('user_agent', $audit->metadata);

        $this->actingAs($user)
            ->deleteJson('/api/user/api-tokens/999999')
            ->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null);
    }

    #[Test]
    public function pat_requests_are_rejected_for_token_management_endpoints(): void
    {
        $user = User::factory()->create();
        $pat = $user->createToken('Read Only', ['read']);
        $plainTextToken = explode('|', $pat->plainTextToken, 2)[1];

        $this->withToken($plainTextToken)
            ->getJson('/api/user/api-tokens')
            ->assertForbidden()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null);

        $this->withToken($plainTextToken)
            ->postJson('/api/user/api-tokens', [
                'name' => 'Should Fail',
                'permissions' => ['read'],
            ])
            ->assertForbidden()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null);
    }
}
