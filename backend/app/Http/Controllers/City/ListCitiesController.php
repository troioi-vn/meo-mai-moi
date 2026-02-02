<?php

declare(strict_types=1);

namespace App\Http\Controllers\City;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class ListCitiesController extends Controller
{
    use ApiResponseTrait;

    #[OA\Get(
        path: '/api/cities',
        summary: 'List cities for a country',
        tags: ['Cities'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'country',
                in: 'query',
                required: true,
                schema: new OA\Schema(type: 'string', minLength: 2, maxLength: 2, example: 'VN')
            ),
            new OA\Parameter(
                name: 'search',
                in: 'query',
                required: false,
                schema: new OA\Schema(type: 'string', maxLength: 50)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'List of cities',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [
                        new OA\Property(
                            property: 'data',
                            type: 'array',
                            items: new OA\Items(ref: '#/components/schemas/City')
                        ),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
    public function __invoke(Request $request)
    {
        $request->validate([
            'country' => 'required|string|size:2',
            'search' => 'nullable|string|max:50',
        ]);

        $query = City::forCountry($request->country)
            ->visibleTo($request->user());

        if ($request->filled('search')) {
            $search = $request->input('search');
            $locale = app()->getLocale();
            $query->whereRaw('name->>? ilike ?', [$locale, "%{$search}%"]);
        }

        $locale = app()->getLocale();
        $cities = $query->orderByRaw('name->>? asc', [$locale])->get();

        return $this->sendSuccess($cities);
    }
}
