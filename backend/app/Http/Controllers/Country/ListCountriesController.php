<?php

declare(strict_types=1);

namespace App\Http\Controllers\Country;

use App\Http\Controllers\Controller;
use App\Models\Country;
use App\Support\CountryCatalog;
use App\Traits\ApiResponseTrait;
use OpenApi\Attributes as OA;

class ListCountriesController extends Controller
{
    use ApiResponseTrait;

    #[OA\Get(
        path: '/api/countries',
        summary: 'List active countries',
        tags: ['Countries'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(
                response: 200,
                description: 'List of countries',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [
                        new OA\Property(
                            property: 'data',
                            type: 'array',
                            items: new OA\Items(
                                properties: [
                                    new OA\Property(property: 'code', type: 'string', example: 'VN'),
                                    new OA\Property(property: 'name', type: 'string', example: 'Vietnam'),
                                    new OA\Property(property: 'phone_prefix', type: 'string', nullable: true, example: '+84'),
                                ],
                                type: 'object'
                            )
                        ),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function __invoke()
    {
        $locale = app()->getLocale();
        $codes = CountryCatalog::allIsoCodes();

        $overrides = Country::query()
            ->get(['code', 'name', 'phone_prefix', 'is_active'])
            ->keyBy('code');

        $countries = collect($codes)
            ->map(function (string $code) use ($overrides, $locale): ?array {
                $override = $overrides->get($code);

                if ($override && ! $override->is_active) {
                    return null;
                }

                $fallbackName = CountryCatalog::localizedName($code, $locale);
                $name = $fallbackName;
                if ($override && is_string($override->name) && $override->name !== '' && $override->name !== $code) {
                    $name = $override->name;
                }

                $phonePrefix = $override?->phone_prefix ?: CountryCatalog::phonePrefix($code);

                return [
                    'code' => $code,
                    'name' => $name,
                    'phone_prefix' => $phonePrefix,
                ];
            })
            ->filter()
            ->values();

        return $this->sendSuccess($countries);
    }
}
