<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ApiTokenRevocationAudit;
use App\Models\User;
use App\Services\ApiTokenRevocationAuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class ApiTokenRevocationAuditServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_revokes_token_and_persists_actor_target_audit_snapshot(): void
    {
        $actor = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.test',
        ]);
        $target = User::factory()->create([
            'name' => 'Target User',
            'email' => 'target@example.test',
        ]);

        $plainTextToken = $target->createToken('Integration Token', ['pets:read', 'pets:write'])->plainTextToken;

        /** @var PersonalAccessToken $token */
        $token = PersonalAccessToken::findToken($plainTextToken);
        $token->forceFill(['last_used_at' => now()->subHour()])->save();

        $result = app(ApiTokenRevocationAuditService::class)->revokeToken(
            token: $token,
            actor: $actor,
            source: 'admin_panel',
            metadata: ['ip' => '127.0.0.1'],
        );

        $this->assertTrue($result);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $token->id,
        ]);

        $audit = ApiTokenRevocationAudit::query()->first();
        $this->assertNotNull($audit);
        $this->assertSame($actor->id, $audit->actor_user_id);
        $this->assertSame($target->id, $audit->target_user_id);
        $this->assertSame($token->id, $audit->token_id);
        $this->assertSame('Integration Token', $audit->token_name);
        $this->assertSame('Admin User', $audit->actor_name);
        $this->assertSame('admin@example.test', $audit->actor_email);
        $this->assertSame('Target User', $audit->target_name);
        $this->assertSame('target@example.test', $audit->target_email);
        $this->assertSame('admin_panel', $audit->source);
        $this->assertIsArray($audit->token_abilities);
        $this->assertSame(['pets:read', 'pets:write'], $audit->token_abilities);
        $this->assertSame(['ip' => '127.0.0.1'], $audit->metadata);
    }
}

