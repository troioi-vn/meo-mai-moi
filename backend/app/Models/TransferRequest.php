<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\TransferRequestStatus;
use Database\Factories\TransferRequestFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TransferRequest extends Model
{
    /** @use HasFactory<TransferRequestFactory> */
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
        *
        * @return BelongsTo<User, $this>
     */
    public function fromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    /**
     * Get the user receiving the pet (recipient).
        *
        * @return BelongsTo<User, $this>
     */
    public function toUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }

    /**
     * Get the placement request this transfer belongs to.
        *
        * @return BelongsTo<PlacementRequest, $this>
     */
    public function placementRequest(): BelongsTo
    {
        return $this->belongsTo(PlacementRequest::class);
    }

    /**
     * Get the accepted response that triggered this transfer.
        *
        * @return BelongsTo<PlacementRequestResponse, $this>
     */
    public function placementRequestResponse(): BelongsTo
    {
        return $this->belongsTo(PlacementRequestResponse::class);
    }

    /**
     * Get the helper profile associated with this transfer request.
     * This is retrieved via the placement request response.
     *
     * @return HelperProfile|null
     */
    public function getHelperProfileAttribute(): ?HelperProfile
    {
        return $this->placementRequestResponse?->helperProfile;
    }

    /**
     * Get the pet being transferred via the placement request.
     *
     * @return Pet|null
     */
    public function getPetAttribute(): ?Pet
    {
        return $this->placementRequest?->pet;
    }
}
