<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
 *         description="Country of the helper"
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
    use HasFactory;

    protected $fillable = [
        'user_id',
        'country',
        'address',
        'city',
        'state',
        'zip_code',
        'phone_number',
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
