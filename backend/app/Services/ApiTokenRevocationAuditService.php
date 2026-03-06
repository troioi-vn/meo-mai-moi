<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ApiTokenRevocationAudit;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

class ApiTokenRevocationAuditService
{
    /**
     * Revoke a token and persist an immutable audit snapshot of the action.
     *
     * @param  array<string, mixed>  $metadata
     */
    public function revokeToken(
        PersonalAccessToken $token,
        ?User $actor,
        string $source = 'admin_panel',
        array $metadata = []
    ): bool {
        $token->loadMissing('tokenable');

        /** @var User|null $target */
        $target = $token->tokenable instanceof User ? $token->tokenable : null;

        return (bool) DB::transaction(function () use ($token, $actor, $target, $source, $metadata): bool {
            ApiTokenRevocationAudit::query()->create([
                'actor_user_id' => $actor?->id,
                'target_user_id' => $target?->id,
                'token_id' => $token->id,
                'token_name' => $token->name,
                'tokenable_type' => $token->tokenable_type,
                'tokenable_id' => $token->tokenable_id,
                'token_abilities' => $token->abilities,
                'token_last_used_at' => $token->last_used_at,
                'source' => $source,
                'actor_name' => $actor?->name,
                'actor_email' => $actor?->email,
                'target_name' => $target?->name,
                'target_email' => $target?->email,
                'metadata' => $metadata,
            ]);

            return $token->delete();
        });
    }
}

