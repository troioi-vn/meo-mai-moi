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
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/groups',
    summary: 'Create a group',
    tags: ['Groups'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['name'],
            properties: [
                new OA\Property(property: 'name', type: 'string', maxLength: 255),
                new OA\Property(
                    property: 'pet_ids',
                    type: 'array',
                    items: new OA\Items(type: 'integer'),
                    nullable: true
                ),
                new OA\Property(property: 'allow_duplicate', type: 'boolean', default: false),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'Group created',
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
class StoreGroupController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use MapsGroupExceptions;

    public function __invoke(Request $request, GroupService $service): JsonResponse
    {
        /** @var User $user */
        $user = $this->requireAuth($request);

        if (! $user->can('create', Group::class)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'pet_ids' => ['sometimes', 'nullable', 'array'],
            'pet_ids.*' => ['integer', 'distinct', 'exists:pets,id'],
            'allow_duplicate' => ['sometimes', 'boolean'],
        ]);
        $allowDuplicate = (bool) ($validated['allow_duplicate'] ?? false);
        unset($validated['allow_duplicate']);
        $accessToken = $user->currentAccessToken();
        $enforceMcpDuplicateGuard = $accessToken !== null
            && $accessToken->can('groups:write');

        try {
            $group = DB::transaction(function () use (
                $allowDuplicate,
                $enforceMcpDuplicateGuard,
                $service,
                $user,
                $validated,
            ): Group {
                if ($enforceMcpDuplicateGuard && ! $allowDuplicate) {
                    $user->newQuery()->whereKey($user->id)->lockForUpdate()->firstOrFail();
                    $existingGroupIds = Group::query()
                        ->whereHas('activeMemberships', function ($query) use ($user): void {
                            $query->where('user_id', $user->id);
                        })
                        ->whereRaw('LOWER(name) = ?', [mb_strtolower(trim($validated['name']))])
                        ->orderBy('id')
                        ->pluck('id')
                        ->map(static fn (mixed $id): int => (int) $id)
                        ->all();
                    if ($existingGroupIds !== []) {
                        throw new HttpResponseException(response()->json([
                            'success' => false,
                            'data' => [
                                'code' => 'duplicate_candidate',
                                'existing_group_ids' => $existingGroupIds,
                            ],
                            'message' => 'A visible group with the same name already exists.',
                            'error' => 'duplicate_group',
                        ], 409));
                    }
                }

                return $service->create(
                    $user,
                    $validated['name'],
                    $validated['pet_ids'] ?? null
                );
            });
        } catch (GroupException $e) {
            return $this->groupExceptionResponse($e);
        }

        return $this->sendSuccess($service->serialize($group, $user), 201);
    }
}
