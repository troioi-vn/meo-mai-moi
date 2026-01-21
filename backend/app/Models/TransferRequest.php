<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\TransferRequestStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'TransferRequest',
    title: 'TransferRequest',
    description: 'Transfer Request model - represents physical transfer of pet(s) between users',
    properties: [
        new OA\Property(property: 'id', type: 'integer', format: 'int64', description: 'Transfer Request ID'),
        new OA\Property(property: 'placement_request_id', type: 'integer', format: 'int64', description: 'ID of the parent placement request'),
        new OA\Property(property: 'placement_request_response_id', type: 'integer', format: 'int64', description: 'ID of the accepted response'),
        new OA\Property(property: 'from_user_id', type: 'integer', format: 'int64', description: 'ID of the user transferring the pet (sender)'),
        new OA\Property(property: 'to_user_id', type: 'integer', format: 'int64', description: 'ID of the user receiving the pet (recipient)'),
        new OA\Property(property: 'status', type: 'string', enum: ['pending', 'confirmed', 'rejected', 'expired', 'canceled'], description: 'Current status of the transfer request'),
        new OA\Property(property: 'confirmed_at', type: 'string', format: 'date-time', nullable: true, description: 'Timestamp when the transfer was confirmed'),
        new OA\Property(property: 'rejected_at', type: 'string', format: 'date-time', nullable: true, description: 'Timestamp when the request was rejected'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Timestamp of transfer request creation'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Timestamp of last transfer request update'),
    ]
)]
class TransferRequest extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'placement_request_id',
        'placement_request_response_id',
        'from_user_id',
        'to_user_id',
        'status',
        'confirmed_at',
        'rejected_at',
    ];

    protected $casts = [
        'confirmed_at' => 'datetime',
        'rejected_at' => 'datetime',
        'status' => TransferRequestStatus::class,
    ];

    /**
     * Get the user transferring the pet (sender).
     */
    public function fromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    /**
     * Get the user receiving the pet (recipient).
     */
    public function toUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }

    /**
     * Get the placement request this transfer belongs to.
     */
    public function placementRequest(): BelongsTo
    {
        return $this->belongsTo(PlacementRequest::class);
    }

    /**
     * Get the accepted response that triggered this transfer.
     */
    public function placementRequestResponse(): BelongsTo
    {
        return $this->belongsTo(PlacementRequestResponse::class);
    }

    /**
     * Get the helper profile associated with this transfer request.
     * This is retrieved via the placement request response.
     */
    public function getHelperProfileAttribute()
    {
        return $this->placementRequestResponse?->helperProfile;
    }

    /**
     * Get the pet being transferred via the placement request.
     */
    public function getPetAttribute()
    {
        return $this->placementRequest?->pet;
    }
}
