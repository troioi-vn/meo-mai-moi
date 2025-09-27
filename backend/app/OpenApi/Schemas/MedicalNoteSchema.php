<?php

namespace App\OpenApi\Schemas;

use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="MedicalNote",
 *     title="MedicalNote",
 *     description="Medical note model",
 *     @OA\Property(property="id", type="integer", format="int64"),
 *     @OA\Property(property="pet_id", type="integer", format="int64"),
 *     @OA\Property(property="note", type="string"),
 *     @OA\Property(property="record_date", type="string", format="date"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class MedicalNoteSchema
{
    // This class exists solely for OpenAPI schema generation
}
