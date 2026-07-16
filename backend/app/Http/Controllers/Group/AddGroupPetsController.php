<?php

declare(strict_types=1);

namespace App\Http\Controllers\Group;

use App\Exceptions\GroupException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Group\Concerns\MapsGroupExceptions;
use App\Models\Group;
use App\Models\User;
use App\Services\Groups\GroupPetService;
use App\Services\Groups\GroupService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/groups/{group}/pets',
    summary: 'Add multiple pets to a group',
    tags: ['Groups'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'group',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['pet_ids'],
            properties: [
                new OA\Property(
                    property: 'pet_ids',
                    type: 'array',
                    minItems: 1,
                    items: new OA\Items(type: 'integer')
                ),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Pets added to group',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean'),
                    new OA\Property(property: 'data', ref: '#/components/schemas/Group'),
                ]
            )
        ),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 422, description: 'Validation or domain error'),
    ]
)]
class AddGroupPetsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use MapsGroupExceptions;

    public function __invoke(
        Request $request,
        Group $group,
        GroupPetService $groupPets,
        GroupService $service
    ): JsonResponse {
        /** @var User $user */
        $user = $this->requireAuth($request);

        if (! $user->can('managePets', $group)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $validated = $request->validate([
            'pet_ids' => ['required', 'array', 'min:1'],
            'pet_ids.*' => ['integer', 'distinct', 'exists:pets,id'],
        ]);

        try {
            $groupPets->addPets($group, $validated['pet_ids'], $user);
        } catch (GroupException $e) {
            return $this->groupExceptionResponse($e);
        }

        return $this->sendSuccess($service->serialize($group->fresh() ?? $group, $user));
    }
}
