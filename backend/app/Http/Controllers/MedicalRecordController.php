<?php

namespace App\Http\Controllers;

use App\Models\Cat;
use App\Models\MedicalRecord;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

class MedicalRecordController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/cats/{cat_id}/medical-records",
     *     summary="Add a new medical record for a cat",
     *     tags={"Cats"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="cat_id",
     *         in="path",
     *         required=true,
     *         description="ID of the cat to add a medical record for",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"record_type", "description", "record_date"},
     *             @OA\Property(property="record_type", type="string", enum={"vaccination", "vet_visit", "medication", "treatment", "other"}, example="vaccination"),
     *             @OA\Property(property="description", type="string", example="Annual rabies vaccination."),
     *             @OA\Property(property="record_date", type="string", format="date", example="2024-01-15"),
     *             @OA\Property(property="vet_name", type="string", nullable=true, example="Dr. Smith"),
     *             @OA\Property(property="attachment_url", type="string", nullable=true, example="http://example.com/doc.pdf")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Medical record created successfully",
     *         @OA\JsonContent(ref="#/components/schemas/MedicalRecord")
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Validation Error"),
     *             @OA\Property(property="errors", type="object", example={"record_type": {"The record type field is required."}})
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden: You are not authorized to add medical records for this cat."
     *     )
     * )
     */
    public function store(Request $request, Cat $cat)
    {
        // Assuming only the cat's owner or an admin can add medical records
        if ($request->user()->id !== $cat->user_id && $request->user()->role !== \App\Enums\UserRole::ADMIN) {
            return response()->json(['message' => 'You are not authorized to add medical records for this cat.'], 403);
        }

        try {
            $validatedData = $request->validate([
                'record_type' => 'required|in:vaccination,vet_visit,medication,treatment,other',
                'description' => 'required|string',
                'record_date' => 'required|date',
                'vet_name' => 'nullable|string|max:255',
                'attachment_url' => 'nullable|url|max:255',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $e->errors(),
            ], 422);
        }

        $medicalRecord = $cat->medicalRecords()->create($validatedData);

        return response()->json($medicalRecord, 201);
    }
}
