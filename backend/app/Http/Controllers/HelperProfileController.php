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
     *     path="/api/helper-profiles",
     *     summary="Get a list of helper profiles with optional filtering and sorting",
     *     tags={"Helper Profiles"},
     *     @OA\Parameter(
     *         name="location",
     *         in="query",
     *         required=false,
     *         description="Filter by location",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Parameter(
     *         name="can_foster",
     *         in="query",
     *         required=false,
     *         description="Filter by ability to foster (true/false)",
     *         @OA\Schema(type="boolean")
     *     ),
     *     @OA\Parameter(
     *         name="can_adopt",
     *         in="query",
     *         required=false,
     *         description="Filter by ability to adopt (true/false)",
     *         @OA\Schema(type="boolean")
     *     ),
     *     @OA\Parameter(
     *         name="sort_by",
     *         in="query",
     *         required=false,
     *         description="Field to sort by (e.g., created_at, location)",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Parameter(
     *         name="sort_direction",
     *         in="query",
     *         required=false,
     *         description="Sort direction (asc/desc)",
     *         @OA\Schema(type="string", enum={"asc", "desc"})
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(ref="#/components/schemas/HelperProfile")
     *         )
     *     )
     * )
     */
    public function index(Request $request)
    {
        $query = HelperProfile::query();

        if ($request->has('location')) {
            $query->where('location', 'like', '%' . $request->input('location') . '%');
        }

        if ($request->has('can_foster')) {
            $query->where('can_foster', $request->boolean('can_foster'));
        }

        if ($request->has('can_adopt')) {
            $query->where('can_adopt', $request->boolean('can_adopt'));
        }

        if ($request->has('sort_by')) {
            $sortBy = $request->input('sort_by');
            $sortDirection = $request->input('sort_direction', 'asc');

            if (in_array($sortBy, ['created_at', 'location'])) {
                $query->orderBy($sortBy, $sortDirection);
            }
        }

        $helperProfiles = $query->get();
        return response()->json($helperProfiles);
    }

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
