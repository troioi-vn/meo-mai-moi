<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferRequest extends Model
{
    use HasFactory;

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
