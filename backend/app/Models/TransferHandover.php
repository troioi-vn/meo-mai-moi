<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use OpenApi\Annotations as OA;

class TransferHandover extends Model
{
    use HasFactory;

    /**
     * @OA\Schema(
     *   schema="TransferHandover",
     *   title="TransferHandover",
     *
     *   @OA\Property(property="id", type="integer"),
     *   @OA\Property(property="transfer_request_id", type="integer"),
     *   @OA\Property(property="owner_user_id", type="integer"),
     *   @OA\Property(property="helper_user_id", type="integer"),
     *   @OA\Property(property="scheduled_at", type="string", format="date-time", nullable=true),
     *   @OA\Property(property="location", type="string", nullable=true),
     *   @OA\Property(property="status", type="string", enum={"pending","confirmed","completed","canceled","disputed"}),
     *   @OA\Property(property="owner_initiated_at", type="string", format="date-time", nullable=true),
     *   @OA\Property(property="helper_confirmed_at", type="string", format="date-time", nullable=true),
     *   @OA\Property(property="condition_confirmed", type="boolean"),
     *   @OA\Property(property="condition_notes", type="string", nullable=true),
     *   @OA\Property(property="completed_at", type="string", format="date-time", nullable=true),
     *   @OA\Property(property="canceled_at", type="string", format="date-time", nullable=true),
     *   @OA\Property(property="created_at", type="string", format="date-time"),
     *   @OA\Property(property="updated_at", type="string", format="date-time")
     * )
     */
    protected $fillable = [
        'transfer_request_id',
        'owner_user_id',
        'helper_user_id',
        'scheduled_at',
        'location',
        'status', // pending, confirmed, completed, canceled, disputed
        'owner_initiated_at',
        'helper_confirmed_at',
        'condition_confirmed',
        'condition_notes',
        'completed_at',
        'canceled_at',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'owner_initiated_at' => 'datetime',
        'helper_confirmed_at' => 'datetime',
        'completed_at' => 'datetime',
        'canceled_at' => 'datetime',
        'condition_confirmed' => 'boolean',
    ];

    public function transferRequest(): BelongsTo
    {
        return $this->belongsTo(TransferRequest::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function helper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'helper_user_id');
    }
}
