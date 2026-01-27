<?php

declare(strict_types=1);

// app/Http/Controllers/VersionController.php

namespace App\Http\Controllers;

use App\Traits\ApiResponseTrait;
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
            content: new OA\JsonContent(ref: '#/components/schemas/VersionResponse')
        ),
    ]
)]
class VersionController extends Controller
{
    use ApiResponseTrait;

    public function show(): JsonResponse
    {
        $version = config('version.api');

        return $this->sendSuccess(['version' => $version]);
    }
}
