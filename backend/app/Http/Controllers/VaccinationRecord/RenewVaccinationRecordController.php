<?php

declare(strict_types=1);

namespace App\Http\Controllers\VaccinationRecord;

use App\Exceptions\FinanceException;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use App\Models\VaccinationRecord;
use App\Services\Finance\HealthFinanceService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesOfflineVersionChecks;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/pets/{pet}/vaccinations/{record}/renew',
    summary: 'Renew a vaccination record (mark old as completed, create new)',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'record', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['vaccine_name', 'administered_at'],
            properties: [
                new OA\Property(property: 'vaccine_name', type: 'string', example: 'Rabies'),
                new OA\Property(property: 'administered_at', type: 'string', format: 'date', example: '2024-11-30'),
                new OA\Property(property: 'due_at', type: 'string', format: 'date', example: '2025-11-30'),
                new OA\Property(property: 'notes', type: 'string', example: 'Annual renewal'),
                new OA\Property(property: 'base_version', type: 'string', description: 'Required for health:write PATs'),
                new OA\Property(property: 'expected_vaccine_name', type: 'string', description: 'Required for health:write PATs'),
                new OA\Property(property: 'expected_administered_at', type: 'string', format: 'date', description: 'Required for health:write PATs'),
                new OA\Property(property: 'finance_expense', ref: '#/components/schemas/FinanceExpenseInput', nullable: true),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 201, description: 'Created', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/VaccinationRecord')])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 409, description: 'Version or expected target conflict'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class RenewVaccinationRecordController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, VaccinationRecord $record, HealthFinanceService $finance): JsonResponse
    {
        $this->validatePetResource($request, $pet, 'vaccinations', $record, allowAdmin: true);
        $token = $request->user()?->currentAccessToken();
        $isMcpWrite = $token instanceof PersonalAccessToken && $token->can('health:write');
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $record)) {
            return $conflict;
        }

        // Cannot renew an already completed record
        if ($record->isCompleted()) {
            throw ValidationException::withMessages([
                'record' => ['This vaccination record has already been completed and cannot be renewed.'],
            ]);
        }

        $validated = $this->validateWithErrorHandling($request, [
            'vaccine_name' => $this->textValidationRules(),
            'administered_at' => $this->dateValidationRules(true, false),
            'due_at' => ['nullable', 'date', 'after_or_equal:administered_at'],
            'notes' => $this->textValidationRules(false, 1000),
            'base_version' => [$isMcpWrite ? 'required' : 'sometimes', 'string'],
            'expected_vaccine_name' => [$isMcpWrite ? 'required' : 'sometimes', 'string', 'max:255'],
            'expected_administered_at' => [$isMcpWrite ? 'required' : 'sometimes', 'date_format:Y-m-d'],
            'finance_expense' => ['sometimes', 'nullable', 'array'],
            'finance_expense.ledger_id' => ['required_with:finance_expense', 'integer'],
            'finance_expense.account_id' => ['required_with:finance_expense', 'integer'],
            'finance_expense.category_id' => ['nullable', 'integer'],
            'finance_expense.amount' => ['required_with:finance_expense', 'string', 'max:64'],
            'finance_expense.description' => ['nullable', 'string', 'max:2000'],
        ]);
        if (isset($validated['expected_vaccine_name'])
            && ! hash_equals((string) $record->vaccine_name, $validated['expected_vaccine_name'])) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }
        if (isset($validated['expected_administered_at'])
            && $record->administered_at?->format('Y-m-d') !== $validated['expected_administered_at']) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }
        unset(
            $validated['base_version'],
            $validated['expected_vaccine_name'],
            $validated['expected_administered_at'],
        );
        if (isset($validated['finance_expense'])
            && $token instanceof PersonalAccessToken
            && $token->can('health:write')
            && ! $token->can('finance:write')) {
            return $this->sendError('Creating a linked finance expense requires finance write access.', 403);
        }
        $expense = $validated['finance_expense'] ?? null;
        unset($validated['finance_expense']);

        // Check uniqueness for the new record (only among active records)
        $exists = VaccinationRecord::query()
            ->whereBelongsTo($pet)
            ->active()
            ->where('id', '!=', $record->id)
            ->where('vaccine_name', $validated['vaccine_name'])
            ->whereDate('administered_at', $validated['administered_at'])
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'administered_at' => ['An active vaccination with this name already exists for this date.'],
            ]);
        }

        /** @var User $actor */
        $actor = $this->requireAuth($request);
        try {
            $newRecord = DB::transaction(function () use ($pet, $record, $validated, $expense, $finance, $actor) {
                $record->markAsCompleted();
                $new = $pet->vaccinations()->create($validated);
                if (is_array($expense)) {
                    $finance->attachExpense($new, $pet, $actor, $expense, $validated['administered_at'], $validated['vaccine_name']);
                }

                return $new;
            });
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }

        return $this->sendSuccess($newRecord, 201);
    }
}
