<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\GroupRole;
use Database\Factories\GroupMembershipFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupMembership extends Model
{
    /** @use HasFactory<GroupMembershipFactory> */
    use HasFactory;

    protected $fillable = [
        'group_id',
        'user_id',
        'role',
        'invited_by_user_id',
        'start_at',
        'end_at',
    ];

    protected $casts = [
        'role' => GroupRole::class,
        'start_at' => 'datetime',
        'end_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<Group, $this>
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('end_at');
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeAdmins(Builder $query): Builder
    {
        return $query->where('role', GroupRole::ADMIN);
    }

    public function isActive(): bool
    {
        return $this->end_at === null;
    }

    public function isAdmin(): bool
    {
        return $this->role === GroupRole::ADMIN;
    }
}
