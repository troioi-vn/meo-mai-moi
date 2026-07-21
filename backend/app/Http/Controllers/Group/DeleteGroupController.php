<?php

declare(strict_types=1);

namespace App\Http\Controllers\Group;

use App\Exceptions\GroupException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Group\Concerns\MapsGroupExceptions;
use App\Models\Group;
use App\Models\User;
use App\Services\Groups\GroupService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Response;

#[OA\Delete(
    path: '/api/groups/{group}',
    summary: 'Delete a group',
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
        new OA\Response(response: 204, description: 'Group deleted'),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class DeleteGroupController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;
    use MapsGroupExceptions;

    public function __invoke(Request $request, Group $group, GroupService $service): JsonResponse|Response
    {
        /** @var User $user */
        $user = $this->requireAuth($request);

        if (! $user->can('delete', $group)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $group)) {
            return $conflict;
        }

        try {
            $service->delete($group, $user);
        } catch (GroupException $e) {
            return $this->groupExceptionResponse($e);
        }

        return $this->sendNoContent();
    }
}
