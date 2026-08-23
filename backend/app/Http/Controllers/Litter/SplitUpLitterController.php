<?php

declare(strict_types=1);

namespace App\Http\Controllers\Litter;

use App\Http\Controllers\Controller;
use App\Models\Litter;
use App\Models\User;
use App\Services\Litter\LitterService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Response;

#[OA\Post(
    path: '/api/litters/{litter}/split-up',
    summary: 'Split up a litter',
    description: 'Detaches every member from the litter and deletes the litter row. No pet is ever deleted.',
    tags: ['Litters'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'litter', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    responses: [
        new OA\Response(response: 204, description: 'Litter dissolved'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Litter not found'),
    ]
)]
class SplitUpLitterController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, Litter $litter, LitterService $litterService): JsonResponse|Response
    {
        $litter->loadMissing('pets');

        /** @var User $user */
        $user = $request->user();

        if ($user->cannot('delete', $litter)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $litterService->dissolve($litter);

        return $this->sendNoContent();
    }
}
