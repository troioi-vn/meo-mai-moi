<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\GroupFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Group extends Model
{
    /** @use HasFactory<GroupFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $fillable = [
        'name',
        'created_by_user_id',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * @return HasMany<GroupMembership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(GroupMembership::class);
    }

    /**
     * @return HasMany<GroupMembership, $this>
     */
    public function activeMemberships(): HasMany
    {
        return $this->memberships()->active();
    }

    /**
     * @return HasMany<GroupPet, $this>
     */
    public function groupPets(): HasMany
    {
        return $this->hasMany(GroupPet::class);
    }

    /**
     * @return HasMany<GroupPet, $this>
     */
    public function activeGroupPets(): HasMany
    {
        return $this->groupPets()->active();
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('deleted_at');
    }
}
