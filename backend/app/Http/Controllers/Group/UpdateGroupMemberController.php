<?php

declare(strict_types=1);

namespace App\Http\Controllers\Group;

use App\Enums\GroupRole;
use App\Exceptions\GroupException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Group\Concerns\MapsGroupExceptions;
use App\Models\Group;
use App\Models\User;
use App\Services\Groups\GroupMembershipService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/groups/{group}/members/{user}',
    summary: 'Update a group member role',
    tags: ['Groups'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'group',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
        new OA\Parameter(
            name: 'user',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['role'],
            properties: [
                new OA\Property(property: 'role', type: 'string', enum: ['admin', 'member']),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Member role updated',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean'),
                    new OA\Property(property: 'data', ref: '#/components/schemas/GroupMember'),
                ]
            )
        ),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 422, description: 'Validation or domain error'),
    ]
)]
class UpdateGroupMemberController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use MapsGroupExceptions;

    public function __invoke(
        Request $request,
        Group $group,
        User $user,
        GroupMembershipService $memberships
    ): JsonResponse {
        /** @var User $actor */
        $actor = $this->requireAuth($request);

        if (! $actor->can('manageMembers', $group)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $validated = $request->validate([
            'role' => ['required', Rule::in(['admin', 'member'])],
        ]);

        try {
            $membership = $memberships->updateRole(
                $group,
                $user,
                GroupRole::from($validated['role']),
                $actor
            );
        } catch (GroupException $e) {
            return $this->groupExceptionResponse($e);
        }

        $membership->loadMissing('user');

        return $this->sendSuccess([
            'user_id' => $membership->user_id,
            'role' => $membership->role?->value,
            'start_at' => $membership->start_at,
            'user' => $membership->user === null ? null : [
                'id' => $membership->user->id,
                'name' => $membership->user->name,
            ],
        ]);
    }
}
