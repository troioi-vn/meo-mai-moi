<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="Review",
 *     title="Review",
 *     description="Review model",
 *     @OA\Property(
 *         property="id",
 *         type="integer",
 *         format="int64",
 *         description="Review ID"
 *     ),
 *     @OA\Property(
 *         property="reviewer_id",
 *         type="integer",
 *         format="int64",
 *         description="ID of the user who wrote the review"
 *     ),
 *     @OA\Property(
 *         property="reviewed_id",
 *         type="integer",
 *         format="int64",
 *         description="ID of the user being reviewed"
 *     ),
 *     @OA\Property(
 *         property="rating",
 *         type="integer",
 *         description="Rating (e.g., 1-5 stars)"
 *     ),
 *     @OA\Property(
 *         property="comment",
 *         type="string",
 *         nullable=true,
 *         description="Review comment"
 *     ),
 *     @OA\Property(
 *         property="created_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of review creation"
 *     ),
 *     @OA\Property(
 *         property="updated_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of last review update"
 *     )
 * )
 */
class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'reviewer_user_id',
        'reviewed_user_id',
        'rating',
        'comment',
        'transfer_id',
    ];

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_user_id');
    }

    public function reviewed(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_user_id');
    }
}
