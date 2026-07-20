<?php

declare(strict_types=1);

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesValidation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/users/me/owner-weights',
    summary: 'Add a new owner weight record for the authenticated user',
    tags: ['User Profile'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['weight_kg', 'record_date'],
            properties: [
                new OA\Property(property: 'weight_kg', type: 'number', format: 'float', example: 62.4),
                new OA\Property(property: 'record_date', type: 'string', format: 'date', example: '2024-01-15'),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 201, description: 'Owner weight record created successfully', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/WeightHistory')])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class StoreOwnerWeightHistoryController extends Controller
{
    use ApiResponseTrait;
    use HandlesValidation;

    public function __invoke(Request $request): JsonResponse
    {
        $validatedData = $this->validateWithErrorHandling($request, [
            'weight_kg' => $this->numericValidationRules(true, 0),
            'record_date' => $this->dateValidationRules(),
        ]);

        $user = $request->user();

        return DB::transaction(function () use ($user, $validatedData): JsonResponse {
            $user->newQuery()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            if ($user->ownerWeightHistories()->whereDate('record_date', $validatedData['record_date'])->exists()) {
                $accessToken = $user->currentAccessToken();
                if ($accessToken instanceof PersonalAccessToken && $accessToken->can('profile:write')) {
                    $existingIds = $user->ownerWeightHistories()
                        ->whereDate('record_date', $validatedData['record_date'])
                        ->orderBy('id')
                        ->pluck('id')
                        ->map(static fn (mixed $id): int => (int) $id)
                        ->all();

                    return response()->json([
                        'success' => false,
                        'data' => [
                            'code' => 'duplicate_candidate',
                            'existing_owner_weight_ids' => $existingIds,
                        ],
                        'message' => 'An owner weight record already exists for this date.',
                        'error' => 'duplicate_owner_weight',
                    ], 409);
                }

                throw ValidationException::withMessages([
                    'record_date' => ['The record date has already been taken for this user.'],
                ]);
            }

            $ownerWeightHistory = $user->ownerWeightHistories()->create($validatedData);

            return $this->sendSuccess($ownerWeightHistory, 201);
        });
    }
}
