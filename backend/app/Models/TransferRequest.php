<?php

namespace App\Models;

use App\Enums\TransferRequestStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @OA\Schema(
 *     schema="TransferRequest",
 *     title="TransferRequest",
 *     description="Transfer Request model",
 *
 *     @OA\Property(property="id", type="integer", format="int64", description="Transfer Request ID"),
 *     @OA\Property(property="pet_id", type="integer", format="int64", description="ID of the pet being transferred"),
 *     @OA\Property(property="initiator_user_id", type="integer", format="int64", description="ID of the user initiating the transfer"),
 *     @OA\Property(property="recipient_user_id", type="integer", format="int64", description="ID of the user intended to receive the pet"),
 *     @OA\Property(property="status", type="string", enum={"pending", "accepted", "rejected"}, description="Current status of the transfer request"),
 *     @OA\Property(property="requested_relationship_type", type="string", enum={"fostering", "permanent_foster"}, description="Type of custodianship requested"),
 *     @OA\Property(property="fostering_type", type="string", enum={"free", "paid"}, nullable=true, description="Type of fostering (free or paid)"),
 *     @OA\Property(property="price", type="number", format="float", nullable=true, description="Price for paid fostering"),
 *     @OA\Property(property="accepted_at", type="string", format="date-time", nullable=true, description="Timestamp when the request was accepted"),
 *     @OA\Property(property="rejected_at", type="string", format="date-time", nullable=true, description="Timestamp when the request was rejected"),
 *     @OA\Property(property="created_at", type="string", format="date-time", description="Timestamp of transfer request creation"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", description="Timestamp of last transfer request update")
 * )
 */
class TransferRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'pet_id', // Updated from cat_id
        'initiator_user_id',
        'recipient_user_id',
        'requester_id',
        'status',
        'requested_relationship_type',
        'fostering_type',
        'price',
        'accepted_at',
        'rejected_at',
        'placement_request_id',
        'helper_profile_id',
    ];

    protected $casts = [
        'accepted_at' => 'datetime',
        'rejected_at' => 'datetime',
        'status' => TransferRequestStatus::class,
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function initiator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiator_user_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function helperProfile()
    {
        return $this->belongsTo(HelperProfile::class);
    }

    public function placementRequest()
    {
        return $this->belongsTo(PlacementRequest::class);
    }

    public function transferHandover()
    {
        return $this->hasOne(TransferHandover::class);
    }
}
