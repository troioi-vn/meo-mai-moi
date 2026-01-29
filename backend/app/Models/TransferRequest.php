<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\TransferRequestStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

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
