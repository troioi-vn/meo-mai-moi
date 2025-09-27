<?php

namespace App\OpenApi\Schemas;

use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="VaccinationRecord",
 *     title="VaccinationRecord",
 *     description="Vaccination record model",
 *     @OA\Property(property="id", type="integer", format="int64"),
 *     @OA\Property(property="pet_id", type="integer", format="int64"),
 *     @OA\Property(property="vaccine_name", type="string"),
 *     @OA\Property(property="administered_at", type="string", format="date"),
 *     @OA\Property(property="due_at", type="string", format="date"),
 *     @OA\Property(property="notes", type="string"),
 *     @OA\Property(property="reminder_sent_at", type="string", format="date-time"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class VaccinationRecordSchema
{
    // Exists solely for OpenAPI schema generation
}
