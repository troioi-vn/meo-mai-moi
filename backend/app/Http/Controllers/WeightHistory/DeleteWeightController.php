<?php

declare(strict_types=1);

namespace App\Http\Controllers\WeightHistory;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\WeightHistory;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/pets/{pet}/weights/{weight}',
    summary: 'Delete a weight record',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'weight', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    responses: [
        new OA\Response(response: 200, description: 'Deleted', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', type: 'boolean', example: true)])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
    ]
)]
class DeleteWeightController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, Pet $pet, WeightHistory $weight)
    {
        $user = $request->user();
        if (! $user) {
            return $this->sendError(__('messages.unauthenticated'), 401);
        }
        $isOwner = $pet->isOwnedBy($user);
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        PetCapabilityService::ensure($pet, 'weight');

        if ($weight->pet_id !== $pet->id) {
            return $this->sendError(__('messages.not_found'), 404);
        }

        $weight->delete();

        return $this->sendSuccess(true);
    }
}
