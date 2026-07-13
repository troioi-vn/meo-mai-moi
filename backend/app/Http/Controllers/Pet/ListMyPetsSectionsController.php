<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Services\PetAccessService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/my-pets/sections',
    summary: 'Get the pets of the authenticated user, organized by section',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(
            response: 200,
            description: "A list of the user's pets, organized by section",
            content: new OA\JsonContent(ref: '#/components/schemas/PetSectionsResponse')
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
    ]
)]
class ListMyPetsSectionsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __construct(
        private readonly PetAccessService $petAccess,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $this->requireAuth($request);

        $sections = $this->petAccess->sectionsForUser($user);

        return $this->sendSuccess([
            'owned' => $sections['owned'],
            'fostering_active' => $sections['fostering_active'],
            'shared' => $sections['shared'],
            'fostering_past' => $sections['fostering_past'],
            'context' => [
                'type' => 'all',
            ],
        ]);
    }
}
