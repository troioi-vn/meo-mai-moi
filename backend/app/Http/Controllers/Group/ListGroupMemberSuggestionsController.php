<?php

declare(strict_types=1);

namespace App\Http\Controllers\Group;

use App\Enums\ResourceInvitationType;
use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\User;
use App\Services\SharingSuggestionService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/groups/{group}/member-suggestions',
    summary: 'List suggested users for a group',
    tags: ['Groups'],
    security: [['sanctum' => []]],
    parameters: [new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
    responses: [
        new OA\Response(response: 200, description: 'Suggested users', content: new OA\JsonContent(properties: [
            new OA\Property(property: 'success', type: 'boolean'),
            new OA\Property(property: 'data', type: 'array', items: new OA\Items(required: ['id', 'name'], properties: [
                new OA\Property(property: 'id', type: 'integer'),
                new OA\Property(property: 'name', type: 'string'),
            ], type: 'object')),
        ])),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class ListGroupMemberSuggestionsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, Group $group, SharingSuggestionService $service): JsonResponse
    {
        /** @var User $actor */
        $actor = $this->requireAuth($request);

        if (! $actor->can('manageMembers', $group)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        return $this->sendSuccess($service->suggestionsFor($actor, ResourceInvitationType::GROUP, $group));
    }
}
