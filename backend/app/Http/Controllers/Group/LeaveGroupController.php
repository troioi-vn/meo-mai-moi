<?php

declare(strict_types=1);

namespace App\Http\Controllers\Group;

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
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Response;

#[OA\Post(
    path: '/api/groups/{group}/leave',
    summary: 'Leave a group',
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
        new OA\Response(response: 204, description: 'Left the group'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 422, description: 'Cannot leave as last admin'),
    ]
)]
class LeaveGroupController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use MapsGroupExceptions;

    public function __invoke(
        Request $request,
        Group $group,
        GroupMembershipService $memberships
    ): JsonResponse|Response {
        /** @var User $user */
        $user = $this->requireAuth($request);

        if (! $user->can('leave', $group)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        try {
            $memberships->leave($group, $user);
        } catch (GroupException $e) {
            return $this->groupExceptionResponse($e);
        }

        return $this->sendNoContent();
    }
}
