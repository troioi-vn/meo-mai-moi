<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\HelperProfileApprovalStatus;
use App\Enums\HelperProfileStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class HelperProfile extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'country',
        'address',
        'city_id',
        'city',
        'state',
        'zip_code',
        'phone_number',
        'contact_info',
        'experience',
        'has_pets',
        'has_children',
        'request_types',
        'approval_status',
        'status',
        'archived_at',
        'restored_at',
    ];

    protected $casts = [
        'has_pets' => 'boolean',
        'has_children' => 'boolean',
        'request_types' => 'array',
        'approval_status' => HelperProfileApprovalStatus::class,
        'status' => HelperProfileStatus::class,
        'archived_at' => 'datetime',
        'restored_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function cities(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(City::class, 'helper_profile_city');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(HelperProfilePhoto::class);
    }

    public function petTypes(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(PetType::class, 'helper_profile_pet_type');
    }

    /**
     * Get all responses made with this helper profile.
     */
    public function placementResponses(): HasMany
    {
        return $this->hasMany(PlacementRequestResponse::class);
    }

    /**
     * Check if the profile has any associated placement requests.
     */
    public function hasPlacementRequests(): bool
    {
        return $this->placementResponses()->exists();
    }

    /**
     * Check if a user can view this helper profile.
     *
     * A user can view a helper profile if:
     * - They are the owner of the helper profile
     * - They own a pet that has a PlacementRequest with a response from this helper profile
     */
    public function isVisibleToUser(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        // Owner can always view
        if ($this->user_id === $user->id) {
            return true;
        }

        // Check if user has a pet with a PlacementRequest that has a response from this helper profile
        return PlacementRequestResponse::query()
            ->where('helper_profile_id', $this->id)
            ->whereHas('placementRequest.pet.owners', function ($query) use ($user): void {
                $query->where('users.id', $user->id);
            })
            ->exists();
    }
}
