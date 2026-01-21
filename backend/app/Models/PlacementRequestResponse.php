<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\PlacementResponseStatus;
use App\Enums\TransferRequestStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PlacementRequestResponse',
    title: 'PlacementRequestResponse',
    description: "Tracks a helper's response to a placement request",
    properties: [
        new OA\Property(property: 'id', type: 'integer', format: 'int64', description: 'Response ID'),
        new OA\Property(property: 'placement_request_id', type: 'integer', format: 'int64', description: 'ID of the placement request'),
        new OA\Property(property: 'helper_profile_id', type: 'integer', format: 'int64', description: 'ID of the helper profile'),
        new OA\Property(property: 'status', type: 'string', enum: ['responded', 'accepted', 'rejected', 'cancelled'], description: 'Current status of the response'),
        new OA\Property(property: 'message', type: 'string', nullable: true, description: 'Optional message from the helper'),
        new OA\Property(property: 'responded_at', type: 'string', format: 'date-time', description: 'When the helper responded'),
        new OA\Property(property: 'accepted_at', type: 'string', format: 'date-time', nullable: true, description: 'When the owner accepted'),
        new OA\Property(property: 'rejected_at', type: 'string', format: 'date-time', nullable: true, description: 'When the owner rejected'),
        new OA\Property(property: 'cancelled_at', type: 'string', format: 'date-time', nullable: true, description: 'When the helper cancelled'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
class PlacementRequestResponse extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'placement_request_id',
        'helper_profile_id',
        'status',
        'message',
        'responded_at',
        'accepted_at',
        'rejected_at',
        'cancelled_at',
    ];

    protected $casts = [
        'status' => PlacementResponseStatus::class,
        'responded_at' => 'datetime',
        'accepted_at' => 'datetime',
        'rejected_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    /**
     * Get the placement request this response belongs to.
     */
    public function placementRequest(): BelongsTo
    {
        return $this->belongsTo(PlacementRequest::class);
    }

    /**
     * Get the helper profile that made this response.
     */
    public function helperProfile(): BelongsTo
    {
        return $this->belongsTo(HelperProfile::class);
    }

    /**
     * Get the transfer request associated with this response.
     */
    public function transferRequest(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(TransferRequest::class, 'placement_request_response_id');
    }

    /**
     * Check if this response can transition to the given status.
     */
    public function canTransitionTo(PlacementResponseStatus $newStatus): bool
    {
        return $this->status->canTransitionTo($newStatus);
    }

    /**
     * Check if this response is in a terminal state.
     */
    public function isTerminal(): bool
    {
        return $this->status->isTerminal();
    }

    /**
     * Accept this response (owner action).
     *
     * For pet_sitting type:
     * - Sets placement request status to ACTIVE
     * - Auto-rejects all other responses
     * - No TransferRequest is created
     *
     * For other types (fostering, permanent):
     * - Creates a TransferRequest with PENDING status
     * - Sets placement request status to PENDING_TRANSFER
     * - Other responses remain until helper confirms the transfer
     */
    public function accept(): bool
    {
        if (! $this->canTransitionTo(PlacementResponseStatus::ACCEPTED)) {
            return false;
        }

        /** @var PlacementRequest $placementRequest */
        $placementRequest = $this->placementRequest;

        // Only allow accepting if the placement request is still open
        if ($placementRequest->status !== PlacementRequestStatus::OPEN) {
            return false;
        }

        $this->update([
            'status' => PlacementResponseStatus::ACCEPTED,
            'accepted_at' => now(),
        ]);

        // Pet sitting doesn't require physical transfer of the pet
        if ($placementRequest->request_type === PlacementRequestType::PET_SITTING) {
            // Set placement request to active immediately
            $placementRequest->update([
                'status' => PlacementRequestStatus::ACTIVE,
            ]);

            // Create sitter relationship (idempotent)
            PetRelationship::updateOrCreate([
                'pet_id' => $placementRequest->pet_id,
                'user_id' => $this->helperProfile->user_id,
                'relationship_type' => \App\Enums\PetRelationshipType::SITTER,
                'end_at' => null,
            ], [
                'start_at' => now(),
                'created_by' => $placementRequest->user_id, // Owner created it
            ]);

            // Auto-reject all other responses
            $placementRequest->rejectOtherResponses($this->id);
        } else {
            // For fostering and permanent placements, create a transfer request
            // The transfer needs to be confirmed by the helper
            /** @var \App\Models\HelperProfile $helperProfile */
            $helperProfile = $this->helperProfile;
            TransferRequest::create([
                'placement_request_id' => $placementRequest->id,
                'placement_request_response_id' => $this->id,
                'from_user_id' => $placementRequest->user_id, // Owner (sender)
                'to_user_id' => $helperProfile->user_id, // Helper (recipient)
                'status' => TransferRequestStatus::PENDING,
            ]);

            // Set placement request to pending transfer
            $placementRequest->update([
                'status' => PlacementRequestStatus::PENDING_TRANSFER,
            ]);
        }

        return true;
    }

    /**
     * Reject this response (owner action).
     */
    public function reject(): bool
    {
        if (! $this->canTransitionTo(PlacementResponseStatus::REJECTED)) {
            return false;
        }

        $oldStatus = $this->status;

        $this->update([
            'status' => PlacementResponseStatus::REJECTED,
            'rejected_at' => now(),
        ]);

        // If it was already accepted, we need to clean up
        if ($oldStatus === PlacementResponseStatus::ACCEPTED) {
            /** @var PlacementRequest $placementRequest */
            $placementRequest = $this->placementRequest;

            // 1. Reset placement request status to OPEN
            if (in_array($placementRequest->status, [
                PlacementRequestStatus::PENDING_TRANSFER,
                PlacementRequestStatus::ACTIVE,
            ])) {
                $placementRequest->update(['status' => PlacementRequestStatus::OPEN]);
            }

            // 2. Reject associated TransferRequest if any
            TransferRequest::where('placement_request_response_id', $this->id)
                ->where('status', \App\Enums\TransferRequestStatus::PENDING)
                ->update([
                    'status' => \App\Enums\TransferRequestStatus::REJECTED,
                    'rejected_at' => now(),
                ]);

            // 3. End sitter relationship if it was pet sitting
            if ($placementRequest->request_type === PlacementRequestType::PET_SITTING) {
                PetRelationship::where('pet_id', $placementRequest->pet_id)
                    ->where('user_id', $this->helperProfile->user_id)
                    ->where('relationship_type', \App\Enums\PetRelationshipType::SITTER)
                    ->whereNull('end_at')
                    ->update(['end_at' => now()]);
            }
        }

        return true;
    }

    /**
     * Cancel this response (helper action).
     */
    public function cancel(): bool
    {
        if (! $this->canTransitionTo(PlacementResponseStatus::CANCELLED)) {
            return false;
        }

        $oldStatus = $this->status;

        $this->update([
            'status' => PlacementResponseStatus::CANCELLED,
            'cancelled_at' => now(),
        ]);

        // If it was already accepted, we need to clean up
        if ($oldStatus === PlacementResponseStatus::ACCEPTED) {
            /** @var PlacementRequest $placementRequest */
            $placementRequest = $this->placementRequest;

            // 1. Reset placement request status to OPEN
            if (in_array($placementRequest->status, [
                PlacementRequestStatus::PENDING_TRANSFER,
                PlacementRequestStatus::ACTIVE,
            ])) {
                $placementRequest->update(['status' => PlacementRequestStatus::OPEN]);
            }

            // 2. Cancel associated TransferRequest if any
            TransferRequest::where('placement_request_response_id', $this->id)
                ->where('status', \App\Enums\TransferRequestStatus::PENDING)
                ->update(['status' => \App\Enums\TransferRequestStatus::CANCELED]);

            // 3. End sitter relationship if it was pet sitting
            if ($placementRequest->request_type === PlacementRequestType::PET_SITTING) {
                PetRelationship::where('pet_id', $placementRequest->pet_id)
                    ->where('user_id', $this->helperProfile->user_id)
                    ->where('relationship_type', \App\Enums\PetRelationshipType::SITTER)
                    ->whereNull('end_at')
                    ->update(['end_at' => now()]);
            }
        }

        return true;
    }

    /**
     * Check if the helper can respond again to the same placement request.
     * A helper can respond again if their previous response was cancelled (not rejected).
     */
    public function allowsReResponse(): bool
    {
        return $this->status->allowsReResponse();
    }

    /**
     * Scope for active (non-terminal) responses.
     */
    public function scopeActive(Builder $query)
    {
        return $query->where('status', PlacementResponseStatus::RESPONDED);
    }

    /**
     * Scope for accepted responses.
     */
    public function scopeAccepted(Builder $query)
    {
        return $query->where('status', PlacementResponseStatus::ACCEPTED);
    }

    /**
     * Scope for responses by a specific helper profile.
     */
    public function scopeByHelperProfile($query, int $helperProfileId)
    {
        return $query->where('helper_profile_id', $helperProfileId);
    }

    /**
     * Scope for responses that block re-responding (rejected responses).
     */
    public function scopeBlockingReResponse(Builder $query)
    {
        return $query->where('status', PlacementResponseStatus::REJECTED);
    }
}
