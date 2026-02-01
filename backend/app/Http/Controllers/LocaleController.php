<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

class LocaleController extends Controller
{
    use ApiResponseTrait;

    #[OA\Get(
        path: '/api/locale',
        summary: 'Get current locale',
        tags: ['Locale'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Current locale information',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(
                            property: 'data',
                            properties: [
                                new OA\Property(property: 'current', type: 'string', example: 'en'),
                                new OA\Property(
                                    property: 'supported',
                                    type: 'array',
                                    items: new OA\Items(type: 'string'),
                                    example: ['en', 'ru']
                                ),
                            ],
                            type: 'object'
                        ),
                    ]
                )
            ),
        ]
    )]
    public function show(): JsonResponse
    {
        return $this->sendSuccess([
            'current' => App::getLocale(),
            'supported' => config('locales.supported', ['en']),
        ]);
    }

    #[OA\Put(
        path: '/api/user/locale',
        summary: 'Update user locale preference',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['locale'],
                properties: [
                    new OA\Property(property: 'locale', type: 'string', example: 'ru'),
                ]
            )
        ),
        tags: ['Locale'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Locale updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'data', ref: '#/components/schemas/UserResource'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'locale' => ['required', 'string', Rule::in(config('locales.supported', ['en']))],
        ]);

        $user = $request->user();
        $user->locale = $validated['locale'];
        $user->save();

        // Update the app locale for this request
        App::setLocale($validated['locale']);

        return $this->sendSuccess(new UserResource($user));
    }
}
