<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use App\Services\Offline\OfflineVersionService;
use App\Services\PetAccessService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/pets/{pet}/sharing',
    summary: 'Get narrowed active pet-sharing state',
    tags: ['Pets'],
    parameters: [
        new OA\Parameter(
            name: 'pet',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(response: 200, description: 'Active collaborators and caller permissions'),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class ShowPetSharingController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __construct(
        private readonly PetAccessService $petAccess,
        private readonly OfflineVersionService $versions,
    ) {
    }

    public function __invoke(Request $request, Pet $pet): JsonResponse
    {
        /** @var User $user */
        $user = $this->requireAuth($request);
        if (! $this->petAccess->hasDirectViewAccess($user, $pet)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $activeRelationships = $pet->activeRelationships()
            ->with('user:id,name')
            ->orderBy('id')
            ->get();
        $relationships = [];
        foreach ($activeRelationships as $relationship) {
            $relationships[] = [
                'relationship_id' => $relationship->id,
                'user_id' => $relationship->user_id,
                'user_name' => $relationship->user?->name,
                'relationship_type' => $relationship->relationship_type?->value,
                'version' => $this->versions->serializeVersion($relationship),
            ];
        }

        $permissions = $this->petAccess->viewerPermissions($user, $pet);
        $relationshipTypes = $pet->activeRelationships()
            ->where('user_id', $user->id)
            ->pluck('relationship_type')
            ->map(static fn ($type): string => $type->value)
            ->values()->all();

        return $this->sendSuccess([
            'pet_id' => $pet->id,
            'pet_name' => $pet->name,
            'version' => $this->versions->serializeVersion($pet),
            'viewer_permissions' => [
                'can_manage_people' => (bool) $permissions['can_manage_people'],
                'is_owner' => (bool) $permissions['is_owner'],
                'has_active_relationship' => $relationshipTypes !== [],
            ],
            'relationship_types' => $relationshipTypes,
            'relationships' => $relationships,
        ]);
    }
}
