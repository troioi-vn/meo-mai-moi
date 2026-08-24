<?php

declare(strict_types=1);

namespace App\Http\Controllers\Litter;

use App\Http\Controllers\Controller;
use App\Models\Litter;
use App\Models\User;
use App\Services\PetAccessService;
use App\Traits\ApiResponseTrait;
use App\Traits\FiltersViewableLitterMembers;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/litters/{litter}',
    summary: 'Rename a litter',
    tags: ['Litters'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'litter',
            in: 'path',
            required: true,
            description: 'ID of the litter to rename',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['name'],
            properties: [
                new OA\Property(property: 'name', type: 'string', maxLength: 255),
                new OA\Property(property: 'base_version', type: 'string', nullable: true),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Litter renamed successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/LitterResponse')
        ),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 409, description: 'Version conflict'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class UpdateLitterController extends Controller
{
    use ApiResponseTrait;
    use FiltersViewableLitterMembers;
    use HandlesOfflineVersionChecks;

    public function __invoke(Request $request, Litter $litter, PetAccessService $petAccess): JsonResponse
    {
        $litter->load(['pets', 'petType', 'creator']);

        /** @var User $user */
        $user = $request->user();

        if ($user->cannot('update', $litter)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $this->filterViewableMembers($litter, $user, $petAccess);

        if ($conflictResponse = $this->rejectUnlessBaseVersionMatches($request, $litter)) {
            return $conflictResponse;
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $litter->update(['name' => $validated['name']]);
        $litter->load(['pets', 'petType', 'creator']);
        $this->filterViewableMembers($litter, $user, $petAccess);

        return $this->sendSuccess($litter);
    }
}
