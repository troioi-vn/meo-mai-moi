<?php

// app/Http/Controllers/VersionController.php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class VersionController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/version",
     *     summary="Get API version",
     *     tags={"System"},
     *
     *     @OA\Response(
     *         response=200,
     *         description="Current API version",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="version", type="string", example="v0.4.0")
     *         )
     *     )
     * )
     */
    public function show(): JsonResponse
    {
        $version = config('version.api', 'v0.0.1');
        return response()->json(['version' => $version]);
    }
}
