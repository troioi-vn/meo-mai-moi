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
 *         property="location",
 *         type="string",
 *         description="Location of the helper"
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
        'location',
        'address',
        'city',
        'state',
        'phone_number',
        'experience',
        'has_pets',
        'has_children',
        'can_foster',
        'can_adopt',
        'status',
        'is_public',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(HelperProfilePhoto::class);
    }
}
