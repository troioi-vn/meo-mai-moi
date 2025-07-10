<?php

namespace App\Http\Controllers;

use App\Models\HelperProfile;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

class HelperProfileController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/helper-profiles/me",
     *     summary="Get authenticated user's helper profile status",
     *     tags={"Helper Profiles"},
     *     security={{"sanctum": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Helper profile not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function show(Request $request)
    {
        $helperProfile = $request->user()->helperProfile;

        if (!$helperProfile) {
            return response()->json(['message' => 'Helper profile not found'], 404);
        }

        return response()->json($helperProfile);
    }

    /**
     * @OA\Post(
     *     path="/api/helper-profiles",
     *     summary="Create a new helper profile",
     *     tags={"Helper Profiles"},
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"location"},
     *             @OA\Property(property="location", type="string", example="London, UK")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Helper profile created successfully",
     *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Validation Error"),
     *             @OA\Property(property="errors", type="object", example={"location": {"The location field is required."}})
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function store(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'address' => 'required|string|max:255',
                'city' => 'required|string|max:255',
                'state' => 'required|string|max:255',
                'zip_code' => 'required|string|max:255',
                'phone_number' => 'required|string|max:255',
                'experience' => 'required|string',
                'has_pets' => 'required|boolean',
                'has_children' => 'required|boolean',
                'can_foster' => 'required|boolean',
                'can_adopt' => 'required|boolean',
                'location' => 'required|string|max:255',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $e->errors(),
            ], 422);
        }

        $helperProfile = HelperProfile::create(array_merge($validatedData, ['user_id' => $request->user()->id]));

        // Trigger HelperVerificationService here if auto-verification is implemented

        return response()->json($helperProfile, 201);
    }
}
