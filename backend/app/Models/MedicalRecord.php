<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="MedicalRecord",
 *     title="MedicalRecord",
 *     description="Medical Record model",
 *     @OA\Property(
 *         property="id",
 *         type="integer",
 *         format="int64",
 *         description="Medical Record ID"
 *     ),
 *     @OA\Property(
 *         property="cat_id",
 *         type="integer",
 *         format="int64",
 *         description="ID of the associated cat"
 *     ),
 *     @OA\Property(
 *         property="record_type",
 *         type="string",
 *         enum={"vaccination", "vet_visit", "medication", "treatment", "other"},
 *         description="Type of medical event"
 *     ),
 *     @OA\Property(
 *         property="description",
 *         type="string",
 *         description="Detailed description of the medical event"
 *     ),
 *     @OA\Property(
 *         property="record_date",
 *         type="string",
 *         format="date",
 *         description="Date the medical event occurred"
 *     ),
 *     @OA\Property(
 *         property="vet_name",
 *         type="string",
 *         nullable=true,
 *         description="Name of the veterinarian or clinic"
 *     ),
 *     @OA\Property(
 *         property="attachment_url",
 *         type="string",
 *         nullable=true,
 *         description="URL to any attached documents"
 *     ),
 *     @OA\Property(
 *         property="created_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of medical record creation"
 *     ),
 *     @OA\Property(
 *         property="updated_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of last medical record update"
 *     )
 * )
 */
class MedicalRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'cat_id',
        'record_type',
        'description',
        'record_date',
        'vet_name',
        'attachment_url',
    ];

    protected $casts = [
        'record_date' => 'date',
    ];

    public function cat(): BelongsTo
    {
        return $this->belongsTo(Cat::class);
    }
}
