<?php

declare(strict_types=1);

namespace App\Http\Controllers\Group;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\User;
use App\Services\Groups\GroupService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/groups/{group}/pets',
    summary: 'List pets assigned to a group',
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
    responses: [
        new OA\Response(
            response: 200,
            description: 'Active group pets',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean'),
                    new OA\Property(
                        property: 'data',
                        type: 'array',
                        items: new OA\Items(type: 'object')
                    ),
                ]
            )
        ),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class ListGroupPetsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, Group $group, GroupService $service): JsonResponse
    {
        /** @var User $user */
        $user = $this->requireAuth($request);

        if (! $user->can('view', $group)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $serialized = $service->serialize($group, $user);

        return $this->sendSuccess($serialized['pets']);
    }
}
