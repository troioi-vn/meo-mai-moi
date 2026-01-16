<?php

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesErrors;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/my-pets',
    summary: 'Get the pets of the authenticated user',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(
            response: 200,
            description: "A list of the user's pets",
            content: new OA\JsonContent(
                type: 'array',
                items: new OA\Items(ref: '#/components/schemas/Pet')
            )
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
    ]
)]
class ListMyPetsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesErrors;

    public function __invoke(Request $request)
    {
        if (! $request->user()) {
            return $this->handleUnauthorized();
        }

        // Get pets where the user is an owner
        $query = Pet::whereHas('owners', function ($q) use ($request) {
            $q->where('users.id', $request->user()->id);
        })->with('petType');

        if ($request->filled('pet_type')) {
            $slug = $request->query('pet_type');
            $query->whereHas('petType', function ($q) use ($slug) {
                $q->where('slug', $slug);
            });
        }

        $pets = $query->get();

        return $this->sendSuccess($pets);
    }
}
