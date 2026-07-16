<?php

declare(strict_types=1);

namespace App\Http\Controllers\Group;

use App\Enums\GroupRole;
use App\Enums\ResourceInvitationType;
use App\Exceptions\GroupException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Group\Concerns\MapsGroupExceptions;
use App\Models\Group;
use App\Models\User;
use App\Services\Groups\GroupMembershipService;
use App\Services\SharingSuggestionService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/groups/{group}/members',
    summary: 'Directly add a suggested user to a group',
    tags: ['Groups'],
    security: [['sanctum' => []]],
    parameters: [new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
    requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
        required: ['user_id', 'role'],
        properties: [
            new OA\Property(property: 'user_id', type: 'integer'),
            new OA\Property(property: 'role', type: 'string', enum: ['admin', 'member']),
        ]
    )),
    responses: [
        new OA\Response(response: 201, description: 'Member added', content: new OA\JsonContent(properties: [
            new OA\Property(property: 'success', type: 'boolean'),
            new OA\Property(property: 'data', ref: '#/components/schemas/GroupMember'),
            new OA\Property(property: 'message', type: 'string', nullable: true),
        ])),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 422, description: 'Validation or domain error'),
    ]
)]
class StoreGroupMemberController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use MapsGroupExceptions;

    public function __invoke(
        Request $request,
        Group $group,
        GroupMembershipService $memberships,
        SharingSuggestionService $suggestions,
    ): JsonResponse {
        /** @var User $actor */
        $actor = $this->requireAuth($request);

        if (! $actor->can('manageMembers', $group)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'role' => ['required', Rule::enum(GroupRole::class)],
        ]);
        /** @var User $target */
        $target = User::query()->findOrFail($validated['user_id']);

        if (! $suggestions->canDirectlyAdd($actor, ResourceInvitationType::GROUP, $group, $target)) {
            return $this->sendError(__('messages.sharing.user_not_suggested'), 422);
        }

        try {
            $membership = $memberships->addMember($group, $target, GroupRole::from($validated['role']), $actor);
        } catch (GroupException $e) {
            return $this->groupExceptionResponse($e);
        }
        $membership->loadMissing('user');

        return $this->sendSuccess([
            'user_id' => $membership->user_id,
            'role' => $membership->role?->value,
            'start_at' => $membership->start_at,
            'user' => ['id' => $target->id, 'name' => $target->name],
        ], 201);
    }
}
