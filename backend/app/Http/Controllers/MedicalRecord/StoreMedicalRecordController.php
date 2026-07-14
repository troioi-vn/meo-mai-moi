<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalRecord;

use App\Exceptions\FinanceException;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use App\Services\Finance\HealthFinanceService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/pets/{pet}/medical-records',
    summary: 'Create a medical record',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['record_type', 'record_date'],
            properties: [
                new OA\Property(property: 'record_type', type: 'string', example: 'Vet Visit'),
                new OA\Property(property: 'description', type: 'string', example: 'Annual checkup - all clear'),
                new OA\Property(property: 'record_date', type: 'string', format: 'date', example: '2024-06-01'),
                new OA\Property(property: 'vet_name', type: 'string', example: 'Dr. Smith'),
                new OA\Property(property: 'finance_expense', ref: '#/components/schemas/FinanceExpenseInput', nullable: true),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 201, description: 'Created', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/MedicalRecord')])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class StoreMedicalRecordController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, HealthFinanceService $finance): JsonResponse
    {
        $this->validatePetResource($request, $pet, 'medical');

        $validated = $this->validateWithErrorHandling($request, [
            'record_type' => ['required', 'string', 'max:100'],
            'description' => $this->textValidationRules(false, 2000),
            'record_date' => $this->dateValidationRules(true, false),
            'vet_name' => $this->textValidationRules(false, 255),
            'finance_expense' => ['sometimes', 'nullable', 'array'],
            'finance_expense.ledger_id' => ['required_with:finance_expense', 'integer'],
            'finance_expense.account_id' => ['required_with:finance_expense', 'integer'],
            'finance_expense.category_id' => ['nullable', 'integer'],
            'finance_expense.amount' => ['required_with:finance_expense', 'string', 'max:64'],
            'finance_expense.description' => ['nullable', 'string', 'max:2000'],
        ]);
        $expense = $validated['finance_expense'] ?? null;
        unset($validated['finance_expense']);
        /** @var User $actor */
        $actor = $this->requireAuth($request);
        try {
            $created = DB::transaction(function () use ($pet, $validated, $expense, $finance, $actor) {
                $record = $pet->medicalRecords()->create($validated);
                if (is_array($expense)) {
                    $finance->attachExpense($record, $pet, $actor, $expense, $validated['record_date'], $validated['description'] ?? $validated['record_type']);
                }

                return $record;
            });
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }

        return $this->sendSuccess($created, 201);
    }
}
