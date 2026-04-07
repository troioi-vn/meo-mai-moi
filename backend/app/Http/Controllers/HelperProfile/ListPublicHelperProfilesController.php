<?php

declare(strict_types=1);

namespace App\Http\Controllers\HelperProfile;

use App\Enums\PlacementRequestType;
use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use App\Support\TranslatableSql;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/helpers',
    summary: 'List public helper profiles',
    tags: ['Helper Profiles'],
    parameters: [
        new OA\Parameter(name: 'country', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
        new OA\Parameter(name: 'city', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
        new OA\Parameter(name: 'request_type', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
        new OA\Parameter(name: 'pet_type_id', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'A list of public helper profiles',
            content: new OA\JsonContent(ref: '#/components/schemas/HelperProfileArrayResponse')
        ),
    ]
)]
class ListPublicHelperProfilesController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $filters = $request->validate([
            'country' => ['nullable', 'string', 'size:2'],
            'city' => ['nullable', 'string', 'max:255'],
            'search' => ['nullable', 'string', 'max:255'],
            'request_type' => ['nullable', Rule::enum(PlacementRequestType::class)],
            'pet_type_id' => ['nullable', 'integer', 'exists:pet_types,id'],
        ]);

        $helperProfiles = HelperProfile::query()
            ->publiclyVisible()
            ->with(['media', 'user:id,name', 'petTypes', 'cities'])
            ->when(isset($filters['country']), function ($query) use ($filters): void {
                $query->where('country', strtoupper($filters['country']));
            })
            ->when(isset($filters['city']), function ($query) use ($filters): void {
                $query->where(function ($cityQuery) use ($filters): void {
                    $cityQuery
                        ->where('city', 'ilike', '%'.$filters['city'].'%')
                        ->orWhereHas('cities', function ($relationQuery) use ($filters): void {
                            [$cityNameExpression, $cityNameBindings] = TranslatableSql::coalescedNameILike($filters['city']);

                            $relationQuery->whereRaw($cityNameExpression, $cityNameBindings);
                        });
                });
            })
            ->when(isset($filters['search']), function ($query) use ($filters): void {
                $query->where(function ($searchQuery) use ($filters): void {
                    $searchQuery
                        ->where('city', 'ilike', '%'.$filters['search'].'%')
                        ->orWhere('state', 'ilike', '%'.$filters['search'].'%')
                        ->orWhere('country', 'ilike', '%'.$filters['search'].'%')
                        ->orWhere('experience', 'ilike', '%'.$filters['search'].'%')
                        ->orWhereHas('user', function ($relationQuery) use ($filters): void {
                            $relationQuery->where('name', 'ilike', '%'.$filters['search'].'%');
                        });
                });
            })
            ->when(isset($filters['request_type']), function ($query) use ($filters): void {
                $query->whereJsonContains('request_types', $filters['request_type']);
            })
            ->when(isset($filters['pet_type_id']), function ($query) use ($filters): void {
                $query->whereHas('petTypes', function ($petTypeQuery) use ($filters): void {
                    $petTypeQuery->where('pet_types.id', $filters['pet_type_id']);
                });
            })
            ->latest()
            ->get();
        $helperProfiles->each->makeHidden(['phone_number', 'contact_details']);

        return $this->sendSuccess($helperProfiles);
    }
}
