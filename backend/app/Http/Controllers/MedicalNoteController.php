<?php

namespace App\Http\Controllers;

use App\Models\MedicalNote;
use App\Models\Pet;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

class MedicalNoteController extends Controller
{
    use ApiResponseTrait, HandlesAuthentication, HandlesPetResources, HandlesValidation;

    /**
     * @OA\Schema(
     *     schema="MedicalNote",
     *     title="MedicalNote",
     *     description="Medical note model",
     *     @OA\Property(property="id", type="integer", format="int64"),
     *     @OA\Property(property="pet_id", type="integer", format="int64"),
     *     @OA\Property(property="note", type="string"),
     *     @OA\Property(property="record_date", type="string", format="date"),
     *     @OA\Property(property="created_at", type="string", format="date-time"),
     *     @OA\Property(property="updated_at", type="string", format="date-time")
     * )
     */

    /**
     * @OA\Get(
     *     path="/api/pets/{pet}/medical-notes",
     *     summary="List medical notes for a pet",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="page", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="List of medical notes",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/MedicalNote")),
     *                 @OA\Property(property="links", type="object"),
     *                 @OA\Property(property="meta", type="object")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function index(Request $request, Pet $pet)
    {
        // For now, reuse 'medical' capability as the gate for notes
        $this->validatePetResource($request, $pet, 'medical');

        $items = $pet->medicalNotes()->orderByDesc('record_date')->paginate(25);
        $payload = [
            'data' => $items->items(),
            'links' => [
                'first' => $items->url(1),
                'last' => $items->url($items->lastPage()),
                'prev' => $items->previousPageUrl(),
                'next' => $items->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $items->currentPage(),
                'from' => $items->firstItem(),
                'last_page' => $items->lastPage(),
                'path' => $items->path(),
                'per_page' => $items->perPage(),
                'to' => $items->lastItem(),
                'total' => $items->total(),
            ],
        ];

        return response()->json(['data' => $payload]);
    }

    /**
     * @OA\Post(
     *     path="/api/pets/{pet}/medical-notes",
     *     summary="Create a medical note",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"note","record_date"},
     *         @OA\Property(property="note", type="string", example="Rabies vaccination"),
     *         @OA\Property(property="record_date", type="string", format="date", example="2024-06-01")
     *     )),
     *     @OA\Response(response=201, description="Created", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/MedicalNote"))),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function store(Request $request, Pet $pet)
    {
        $this->validatePetResource($request, $pet, 'medical');

        $validated = $request->validate([
            'note' => 'required|string',
            'record_date' => 'required|date',
        ]);

        // Enforce per-pet uniqueness by date
        if ($pet->medicalNotes()->whereDate('record_date', $validated['record_date'])->exists()) {
            throw ValidationException::withMessages([
                'record_date' => ['The record date has already been taken for this pet.'],
            ]);
        }

        $created = $pet->medicalNotes()->create($validated);
        return $this->sendSuccess($created, 201);
    }

    /**
     * @OA\Get(
     *     path="/api/pets/{pet}/medical-notes/{note}",
     *     summary="Get a single medical note",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="note", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/MedicalNote"))),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function show(Request $request, Pet $pet, MedicalNote $note)
    {
        $user = $request->user();
        if (! $user) return $this->sendError('Unauthenticated.', 401);
        $isOwner = $user->id === $pet->user_id;
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) return $this->sendError('Forbidden.', 403);
        PetCapabilityService::ensure($pet, 'medical');

        if ($note->pet_id !== $pet->id) return $this->sendError('Not found.', 404);
        return $this->sendSuccess($note);
    }

    /**
     * @OA\Put(
     *     path="/api/pets/{pet}/medical-notes/{note}",
     *     summary="Update a medical note",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="note", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="note", type="string"),
     *         @OA\Property(property="record_date", type="string", format="date")
     *     )),
     *     @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/MedicalNote"))),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=404, description="Not found"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function update(Request $request, Pet $pet, MedicalNote $note)
    {
        $user = $request->user();
        if (! $user) return $this->sendError('Unauthenticated.', 401);
        $isOwner = $user->id === $pet->user_id;
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) return $this->sendError('Forbidden.', 403);
        PetCapabilityService::ensure($pet, 'medical');
        if ($note->pet_id !== $pet->id) return $this->sendError('Not found.', 404);

        $validated = $request->validate([
            'note' => 'sometimes|string',
            'record_date' => 'sometimes|date',
        ]);

        if (array_key_exists('record_date', $validated)) {
            $exists = $pet->medicalNotes()
                ->where('id', '!=', $note->id)
                ->whereDate('record_date', $validated['record_date'])
                ->exists();
            if ($exists) {
                throw ValidationException::withMessages([
                    'record_date' => ['The record date has already been taken for this pet.'],
                ]);
            }
        }

        $note->update($validated);
        return $this->sendSuccess($note);
    }

    /**
     * @OA\Delete(
     *     path="/api/pets/{pet}/medical-notes/{note}",
     *     summary="Delete a medical note",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="note", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Deleted", @OA\JsonContent(@OA\Property(property="data", type="boolean", example=true))),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function destroy(Request $request, Pet $pet, MedicalNote $note)
    {
        $user = $request->user();
        if (! $user) return $this->sendError('Unauthenticated.', 401);
        $isOwner = $user->id === $pet->user_id;
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) return $this->sendError('Forbidden.', 403);
        PetCapabilityService::ensure($pet, 'medical');
        if ($note->pet_id !== $pet->id) return $this->sendError('Not found.', 404);
        $note->delete();
        return response()->json(['data' => true]);
    }
}
