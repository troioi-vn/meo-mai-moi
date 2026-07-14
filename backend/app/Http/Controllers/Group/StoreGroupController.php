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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
        ]);

        try {
            $group = $service->create(
                $user,
                $validated['name'],
                $validated['pet_ids'] ?? null
            );
        } catch (GroupException $e) {
            return $this->groupExceptionResponse($e);
        }

        return $this->sendSuccess($service->serialize($group, $user), 201);
    }
}
