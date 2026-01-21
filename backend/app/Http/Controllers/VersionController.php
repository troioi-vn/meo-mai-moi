<?php

declare(strict_types=1);

// app/Http/Controllers/VersionController.php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/version',
    summary: 'Get API version',
    tags: ['System'],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Current API version',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'version', type: 'string', example: 'v0.4.0'),
                ]
            )
        ),
    ]
)]
class VersionController extends Controller
{
    public function show(): JsonResponse
    {
        $version = config('version.api');

        return response()->json(['version' => $version]);
    }
}
