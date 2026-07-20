<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Enums\PetStatus;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Enum;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/pets/{id}/status',
    summary: "Update a pet's status",
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'id', in: 'path', required: true, description: 'ID of the pet to update', schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['status'],
            properties: [
                new OA\Property(property: 'status', type: 'string', enum: PetStatus::class, example: 'lost'),
                new OA\Property(property: 'expected_name', type: 'string'),
                new OA\Property(property: 'expected_status', type: 'string', enum: PetStatus::class),
                new OA\Property(property: 'base_version', type: 'string', format: 'date-time'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Pet status updated successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/PetResponse')
        ),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 409, description: 'Target or version conflict'),
        new OA\Response(response: 422, description: 'Validation Error'),
    ]
)]
class UpdatePetStatusController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;

    public function __invoke(Request $request, Pet $pet): JsonResponse
    {
        $this->authorizeUser($request, 'update', $pet);
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $pet)) {
            return $conflict;
        }

        $validated = $request->validate([
            'status' => ['required', 'string', new Enum(PetStatus::class)],
            'expected_name' => ['sometimes', 'required', 'string', 'max:255'],
            'expected_status' => ['sometimes', 'required', 'string', new Enum(PetStatus::class)],
        ]);
        if (($validated['status'] ?? null) === PetStatus::DELETED->value) {
            return $this->sendError('Use the pet deletion endpoint for deleted status.', 422);
        }
        if (isset($validated['expected_name'])
            && ! hash_equals((string) $pet->name, (string) $validated['expected_name'])) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }
        if (isset($validated['expected_status'])
            && (string) $pet->status->value !== (string) $validated['expected_status']) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }

        $pet->status = $validated['status'];
        $pet->save();

        $pet->load('petType');

        return $this->sendSuccess($pet);
    }
}
