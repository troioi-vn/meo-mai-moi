<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A headless MCP agent's credential: a client id and a hashed secret that the
 * gateway's client_credentials grant trades for short-lived Sanctum tokens.
 *
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property string $client_id
 * @property string $secret_hash
 * @property list<string> $scopes
 * @property Carbon|null $expires_at
 * @property Carbon|null $last_used_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class McpAgentClient extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'client_id',
        'secret_hash',
        'scopes',
        'expires_at',
        'last_used_at',
    ];

    protected $hidden = ['secret_hash'];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'expires_at' => 'datetime',
            'last_used_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** The name every Sanctum token minted for this client carries. */
    public function tokenName(): string
    {
        return 'mcp-agent:'.$this->client_id;
    }
}
