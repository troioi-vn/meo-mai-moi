<?php

declare(strict_types=1);

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Response;

#[OA\Delete(
    path: '/api/users/me/avatar',
    summary: "Delete authenticated user's avatar",
    tags: ['User Profile'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: false,
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'base_version', type: 'string', format: 'date-time'),
            new OA\Property(property: 'expected_avatar_url', type: 'string', format: 'uri'),
        ])
    ),
    responses: [
        new OA\Response(
            response: 204,
            description: 'Avatar deleted successfully'
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
        new OA\Response(
            response: 404,
            description: 'No avatar to delete'
        ),
    ]
)]
class DeleteAvatarController extends Controller
{
    use ApiResponseTrait;
    use HandlesOfflineVersionChecks;

    public function __invoke(Request $request): JsonResponse|Response
    {
        $user = $request->user();
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $user)) {
            return $conflict;
        }

        $validated = $request->validate([
            'expected_avatar_url' => ['sometimes', 'required', 'string', 'max:2048'],
        ]);

        if (! $user->avatar_url) {
            return $this->sendError(__('messages.profile.no_avatar'), 404);
        }
        if (isset($validated['expected_avatar_url'])
            && ! hash_equals((string) $user->avatar_url, (string) $validated['expected_avatar_url'])) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }

        // Clear avatar from MediaLibrary
        $user->clearMediaCollection('avatar');
        $user->touch();

        return $this->sendNoContent();
    }
}
