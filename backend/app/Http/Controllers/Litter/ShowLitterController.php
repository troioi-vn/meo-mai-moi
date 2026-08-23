<?php

declare(strict_types=1);

namespace App\Http\Controllers\Litter;

use App\Http\Controllers\Controller;
use App\Models\Litter;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/litters/{litter}',
    summary: 'Get a litter',
    tags: ['Litters'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'litter',
            in: 'path',
            required: true,
            description: 'ID of the litter',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'The litter with its members',
            content: new OA\JsonContent(ref: '#/components/schemas/LitterResponse')
        ),
        new OA\Response(response: 404, description: 'Litter not found'),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class ShowLitterController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, Litter $litter): JsonResponse
    {
        $litter->load(['pets', 'petType', 'creator']);

        /** @var User $user */
        $user = $request->user();

        if ($user->cannot('view', $litter)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        return $this->sendSuccess($litter);
    }
}
