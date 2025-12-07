<?php

namespace App\Models;

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
 *         enum={"active", "cancelled", "deleted"},
 *         description="Status of the helper profile"
 *     ),
 *     @OA\Property(
 *         property="is_public",
 *         type="boolean",
 *         description="Is the helper profile public"
 *     ),
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
 *     )
 * )
 */
class HelperProfile extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'country',
        'address',
        'city',
        'state',
        'zip_code',
        'phone_number',
        'contact_info',
        'experience',
        'has_pets',
        'has_children',
        'can_foster',
        'can_adopt',
        'approval_status',
        'is_public',
    ];

    protected $casts = [
        'has_pets' => 'boolean',
        'has_children' => 'boolean',
        'can_foster' => 'boolean',
        'can_adopt' => 'boolean',
        'is_public' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(HelperProfilePhoto::class);
    }

    public function petTypes(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(PetType::class, 'helper_profile_pet_type');
    }
}
