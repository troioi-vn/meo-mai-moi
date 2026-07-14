<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\GroupRole;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupResourceInvitation extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'resource_invitation_id';

    protected $fillable = [
        'resource_invitation_id',
        'group_id',
        'role',
    ];

    protected $casts = [
        'role' => GroupRole::class,
    ];

    /**
     * @return BelongsTo<ResourceInvitation, $this>
     */
    public function invitation(): BelongsTo
    {
        return $this->belongsTo(ResourceInvitation::class, 'resource_invitation_id');
    }

    /**
     * @return BelongsTo<Group, $this>
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }
}
