<?php

namespace App\Http\Controllers\MedicalNote;

use App\Http\Controllers\Controller;
use App\Models\MedicalNote;
use App\Models\Pet;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: "/api/pets/{pet}/medical-notes/{note}",
    summary: "Get a single medical note",
    tags: ["Pets"],
    security: [["sanctum" => []]],
    parameters: [
        new OA\Parameter(name: "pet", in: "path", required: true, schema: new OA\Schema(type: "integer")),
        new OA\Parameter(name: "note", in: "path", required: true, schema: new OA\Schema(type: "integer")),
    ],
    responses: [
        new OA\Response(response: 200, description: "OK", content: new OA\JsonContent(properties: [new OA\Property(property: "data", ref: "#/components/schemas/MedicalNote")])),
        new OA\Response(response: 401, description: "Unauthenticated"),
        new OA\Response(response: 403, description: "Forbidden"),
        new OA\Response(response: 404, description: "Not found"),
    ]
)]
class ShowMedicalNoteController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, Pet $pet, MedicalNote $note)
    {
        $user = $request->user();
        if (! $user) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $isOwner = $pet->isOwnedBy($user);
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) {
            return $this->sendError('Forbidden.', 403);
        }
        PetCapabilityService::ensure($pet, 'medical');

        if ($note->pet_id !== $pet->id) {
            return $this->sendError('Not found.', 404);
        }

        return $this->sendSuccess($note);
    }
}