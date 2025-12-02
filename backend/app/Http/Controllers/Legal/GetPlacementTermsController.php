<?php

namespace App\Http\Controllers\Legal;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\File;

/**
 * @OA\Get(
 *     path="/api/legal/placement-terms",
 *     summary="Get placement terms and conditions",
 *     description="Retrieve the placement terms and conditions document in markdown format.",
 *     tags={"Legal"},
 *
 *     @OA\Response(
 *         response=200,
 *         description="Placement terms retrieved successfully",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="content", type="string", description="Markdown content of the placement terms"),
 *                 @OA\Property(property="version", type="string", example="2025-12-02", description="Version date of the terms")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Terms document not found",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Placement terms not found")
 *         )
 *     )
 * )
 */
class GetPlacementTermsController extends Controller
{
    public function __invoke()
    {
        $path = resource_path('markdown/placement-terms.md');

        if (! File::exists($path)) {
            return response()->json([
                'message' => 'Placement terms not found',
            ], 404);
        }

        $content = File::get($path);
        $lastModified = File::lastModified($path);
        $version = date('Y-m-d', $lastModified);

        return response()->json([
            'data' => [
                'content' => $content,
                'version' => $version,
            ],
        ])->header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    }
}
