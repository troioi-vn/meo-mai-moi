<?php

namespace App\OpenApi\Schemas;

use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="MedicalRecord",
 *     title="MedicalRecord",
 *     description="Medical record model",
 *
 *     @OA\Property(property="id", type="integer", format="int64"),
 *     @OA\Property(property="pet_id", type="integer", format="int64"),
 *     @OA\Property(property="record_type", type="string", enum={"vaccination", "vet_visit", "medication", "treatment", "other"}),
 *     @OA\Property(property="description", type="string"),
 *     @OA\Property(property="record_date", type="string", format="date"),
 *     @OA\Property(property="vet_name", type="string", nullable=true),
 *     @OA\Property(property="attachment_url", type="string", nullable=true),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class MedicalRecordSchema
{
    // Exists solely for OpenAPI schema generation
}
