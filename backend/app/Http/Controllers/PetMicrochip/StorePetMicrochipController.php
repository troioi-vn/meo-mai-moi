<?php

declare(strict_types=1);

namespace App\Http\Controllers\PetMicrochip;

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
    path: '/api/pets/{pet}/microchips',
    summary: 'Add a new microchip record for a pet',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'pet',
            in: 'path',
            required: true,
            description: 'ID of the pet to add a microchip record for',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['chip_number'],
            properties: [
                new OA\Property(property: 'chip_number', type: 'string', example: '982000123456789'),
                new OA\Property(property: 'issuer', type: 'string', example: 'HomeAgain'),
                new OA\Property(property: 'implanted_at', type: 'string', format: 'date', example: '2024-01-15'),
                new OA\Property(property: 'finance_expense', ref: '#/components/schemas/FinanceExpenseInput', nullable: true),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'Microchip record created successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/PetMicrochip'),
                ]
            )
        ),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class StorePetMicrochipController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, HealthFinanceService $finance): JsonResponse
    {
        $this->validatePetResource($request, $pet, 'microchips', allowAdmin: true);

        $validated = $this->validateWithErrorHandling($request, [
            'chip_number' => [
                'required',
                'string',
                'min:10',
                'max:20',
                $this->uniqueValidationRule('pet_microchips', 'chip_number'),
            ],
            'issuer' => $this->textValidationRules(false),
            'implanted_at' => $this->dateValidationRules(false, false),
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
            $microchip = DB::transaction(function () use ($pet, $validated, $expense, $finance, $actor) {
                $record = $pet->microchips()->create($validated);
                if (is_array($expense)) {
                    $finance->attachExpense($record, $pet, $actor, $expense, $validated['implanted_at'] ?? now()->toDateString(), 'Microchip');
                }

                return $record;
            });
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }
        $microchip->loadExists('healthFinanceLink');

        return $this->sendSuccessWithMeta($microchip, __('messages.pets.microchip_created'), 201);
    }
}
