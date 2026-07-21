<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Enums\PetStatus;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Enum;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Response;

#[OA\Delete(
    path: '/api/pets/{id}',
    summary: 'Delete a pet',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the pet to delete',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    requestBody: new OA\RequestBody(
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'expected_name', type: 'string'),
            new OA\Property(property: 'expected_status', type: 'string', enum: PetStatus::class),
            new OA\Property(property: 'base_version', type: 'string', format: 'date-time'),
        ])
    ),
    responses: [
        new OA\Response(
            response: 204,
            description: 'Pet deleted successfully'
        ),
        new OA\Response(
            response: 403,
            description: 'Forbidden'
        ),
        new OA\Response(response: 409, description: 'Target or version conflict'),
        new OA\Response(
            response: 422,
            description: 'Validation error'
        ),
    ]
)]
class DeletePetController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;

    public function __invoke(Request $request, Pet $pet): Response
    {
        $this->authorizeUser($request, 'delete', $pet);
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $pet)) {
            return $conflict;
        }
        $validated = $request->validate([
            'expected_name' => ['sometimes', 'required', 'string', 'max:255'],
            'expected_status' => ['sometimes', 'required', 'string', new Enum(PetStatus::class)],
        ]);
        if (isset($validated['expected_name'])
            && ! hash_equals((string) $pet->name, (string) $validated['expected_name'])) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }
        if (isset($validated['expected_status'])
            && (string) $pet->status->value !== (string) $validated['expected_status']) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }

        // Soft delete via status mutation (handled by overridden delete())
        $pet->delete();

        return response()->noContent();
    }
}
