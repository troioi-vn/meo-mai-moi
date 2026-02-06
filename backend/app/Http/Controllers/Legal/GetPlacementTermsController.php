<?php

declare(strict_types=1);

namespace App\Http\Controllers\Legal;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\File;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/legal/placement-terms',
    summary: 'Get placement terms and conditions',
    description: 'Retrieve the placement terms and conditions document in markdown format.',
    tags: ['Legal'],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Placement terms retrieved successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'data',
                        type: 'object',
                        properties: [
                            new OA\Property(property: 'content', type: 'string', description: 'Markdown content of the placement terms'),
                            new OA\Property(property: 'version', type: 'string', example: '2025-12-02', description: 'Version date of the terms'),
                        ]
                    ),
                ]
            )
        ),
        new OA\Response(
            response: 404,
            description: 'Terms document not found',
            content: new OA\JsonContent(ref: '#/components/schemas/ApiErrorMessageResponse')
        ),
    ]
)]
class GetPlacementTermsController extends Controller
{
    use ApiResponseTrait;

    public function __invoke()
    {
        $path = resource_path('markdown/placement-terms.md');

        if (! File::exists($path)) {
            return $this->sendError(__('messages.placement.terms_not_found'), 404);
        }

        $content = File::get($path);
        $lastModified = File::lastModified($path);
        $version = date('Y-m-d', $lastModified);

        return $this->sendSuccess([
            'content' => $content,
            'version' => $version,
        ])->header('Cache-Control', 'max-age=3600, public'); // Cache for 1 hour
    }
}
