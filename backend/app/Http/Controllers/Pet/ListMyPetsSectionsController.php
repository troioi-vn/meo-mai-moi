<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Services\PetAccessService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/my-pets/sections',
    summary: 'Get the pets of the authenticated user, organized by section',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'group_id',
            in: 'query',
            required: false,
            description: 'When provided, return pets for that Group context. Requires active Group membership.',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: "A list of the user's pets, organized by section",
            content: new OA\JsonContent(ref: '#/components/schemas/PetSectionsResponse')
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
        new OA\Response(
            response: 403,
            description: 'Not a member of the requested Group'
        ),
    ]
)]
class ListMyPetsSectionsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __construct(
        private readonly PetAccessService $petAccess,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $this->requireAuth($request);

        $validated = $request->validate([
            'group_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('groups', 'id')->whereNull('deleted_at'),
            ],
        ]);

        $groupId = isset($validated['group_id']) ? (int) $validated['group_id'] : null;

        try {
            $sections = $this->petAccess->sectionsForUser($user, $groupId);
        } catch (AuthorizationException $exception) {
            return $this->sendError($exception->getMessage(), 403);
        }

        return $this->sendSuccess([
            'owned' => $sections['owned'],
            'fostering_active' => $sections['fostering_active'],
            'shared' => $sections['shared'],
            'fostering_past' => $sections['fostering_past'],
            'context' => $sections['context'],
        ]);
    }
}
