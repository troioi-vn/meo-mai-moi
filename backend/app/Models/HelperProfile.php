<?php

namespace App\Models;

use App\Enums\HelperProfileStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="HelperProfile",
 *     title="HelperProfile",
 *     description="Helper Profile model",
 *
 *     @OA\Property(
 *         property="id",
 *         type="integer",
 *         format="int64",
 *         description="Helper Profile ID"
 *     ),
 *     @OA\Property(
 *         property="user_id",
 *         type="integer",
 *         format="int64",
 *         description="ID of the associated user"
 *     ),
 *     @OA\Property(
 *         property="status",
 *         type="string",
 *         enum={"active", "archived", "deleted"},
 *         description="Status of the helper profile"
 *     ),
 *     @OA\Property(
 *         property="request_types",
 *         type="array",
 *
 *         @OA\Items(type="string", enum={"foster_paid", "foster_free", "permanent"}),
 *         description="Types of placement requests this helper can respond to"
 *     ),
 *
 *     @OA\Property(
 *         property="country",
 *         type="string",
 *         description="ISO 3166-1 alpha-2 country code"
 *     ),
 *     @OA\Property(
 *         property="state",
 *         type="string",
 *         nullable=true,
 *         description="State/Province"
 *     ),
 *     @OA\Property(
 *         property="city",
 *         type="string",
 *         nullable=true,
 *         description="City"
 *     ),
 *     @OA\Property(
 *         property="address",
 *         type="string",
 *         nullable=true,
 *         description="Street address"
 *     ),
 *     @OA\Property(
 *         property="zip_code",
 *         type="string",
 *         nullable=true,
 *         description="ZIP/Postal code"
 *     ),
 *     @OA\Property(
 *         property="contact_info",
 *         type="string",
 *         nullable=true,
 *         description="Additional contact information visible to pet owners when responding to placement requests"
 *     ),
 *     @OA\Property(
 *         property="created_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of helper profile creation"
 *     ),
 *     @OA\Property(
 *         property="updated_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of last helper profile update"
 *     ),
 *     @OA\Property(
 *         property="archived_at",
 *         type="string",
 *         format="date-time",
 *         nullable=true,
 *         description="Timestamp when the profile was archived"
 *     ),
 *     @OA\Property(
 *         property="restored_at",
 *         type="string",
 *         format="date-time",
 *         nullable=true,
 *         description="Timestamp when the profile was restored"
 *     ),
 *     @OA\Property(
 *         property="deleted_at",
 *         type="string",
 *         format="date-time",
 *         nullable=true,
 *         description="Timestamp when the profile was deleted"
 *     )
 * )
 */
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
            ->whereHas('placementRequest.pet.owners', function ($query) use ($user) {
                $query->where('users.id', $user->id);
            })
            ->exists();
    }
}
