<?php

declare(strict_types=1);

namespace App\Http\Controllers\Litter;

use App\Http\Controllers\Controller;
use App\Models\Litter;
use App\Models\Pet;
use App\Models\User;
use App\Services\Litter\LitterService;
use App\Services\PetAccessService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Response;

#[OA\Delete(
    path: '/api/litters/{litter}/members/{pet}',
    summary: 'Separate a pet from a litter',
    description: 'Detaches one pet from the litter. If the litter would be left with fewer than two live members, the remaining member is also detached and the litter is deleted. No pet is ever deleted.',
    tags: ['Litters'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'litter', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'base_version', in: 'query', required: false, schema: new OA\Schema(type: 'string', nullable: true)),
    ],
    responses: [
        new OA\Response(response: 204, description: 'Pet separated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Litter or pet not found'),
        new OA\Response(response: 409, description: 'Version conflict'),
        new OA\Response(response: 422, description: 'Pet is not a member of the litter'),
    ]
)]
class RemoveLitterMemberController extends Controller
{
    use ApiResponseTrait;
    use HandlesOfflineVersionChecks;

    public function __invoke(
        Request $request,
        Litter $litter,
        Pet $pet,
        LitterService $litterService,
        PetAccessService $petAccess,
    ): JsonResponse|Response {
        $litter->loadMissing('pets');

        /** @var User $user */
        $user = $request->user();

        if ($user->cannot('update', $litter)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        if (! $petAccess->canEdit($user, $pet)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        if ($conflictResponse = $this->rejectUnlessBaseVersionMatches($request, $litter)) {
            return $conflictResponse;
        }

        if ((int) $pet->litter_id !== (int) $litter->id) {
            return $this->sendError(__('litters.errors.not_member'), 422);
        }

        $litterService->detachMember($litter, $pet);

        return $this->sendNoContent();
    }
}
