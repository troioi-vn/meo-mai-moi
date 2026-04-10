<?php

declare(strict_types=1);

namespace App\Http\Controllers\Habit;

use App\Enums\HabitValueType;
use App\Http\Controllers\Controller;
use App\Models\Habit;
use App\Models\HabitEntry;
use App\Models\Pet;
use App\Services\HabitAccessService;
use App\Services\HabitPresenter;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesValidation;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/habits/{habit}/entries/{date}',
    summary: 'Upsert entries for one habit date',
    tags: ['Habits'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'habit', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'date', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'date')),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['entries'],
            properties: [
                new OA\Property(
                    property: 'entries',
                    type: 'array',
                    items: new OA\Items(
                        properties: [
                            new OA\Property(property: 'pet_id', type: 'integer'),
                            new OA\Property(property: 'value_int', type: 'integer', nullable: true),
                        ]
                    )
                ),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Habit day entries updated',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'data',
                        properties: [
                            new OA\Property(property: 'habit', ref: '#/components/schemas/Habit'),
                            new OA\Property(property: 'date', type: 'string', format: 'date'),
                            new OA\Property(
                                property: 'entries',
                                type: 'array',
                                items: new OA\Items(ref: '#/components/schemas/HabitDayEntry')
                            ),
                        ],
                        type: 'object'
                    ),
                ]
            )
        ),
    ]
)]
class UpsertHabitDayEntriesController extends Controller
{
    use ApiResponseTrait;
    use HandlesValidation;

    public function __invoke(
        Request $request,
        Habit $habit,
        string $date,
        HabitAccessService $accessService,
        HabitPresenter $presenter
    ) {
        $this->authorize('update', $habit);
        $user = $request->user();
        $day = Carbon::parse($date)->startOfDay();

        if ($day->isFuture()) {
            throw ValidationException::withMessages([
                'date' => [__('messages.habits.future_dates_not_allowed')],
            ]);
        }

        $data = $this->validateWithErrorHandling($request, [
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.pet_id' => ['required', 'integer', 'exists:pets,id', 'distinct'],
            'entries.*.value_int' => ['nullable', 'integer'],
        ]);

        $habit->load('pets');

        DB::transaction(function () use ($data, $habit, $user, $day, $accessService): void {
            foreach ($data['entries'] as $row) {
                $pet = Pet::findOrFail((int) $row['pet_id']);
                if (! $accessService->canManagePetWithinHabit($user, $habit, $pet)) {
                    abort(403, __('messages.habits.pet_not_accessible'));
                }

                $value = $row['value_int'] ?? null;
                if ($value === null) {
                    $habit->entries()
                        ->where('pet_id', $pet->id)
                        ->whereDate('entry_date', $day->toDateString())
                        ->delete();

                    continue;
                }

                $this->assertValueAllowed($habit, $value);

                $habit->entries()->updateOrCreate(
                    [
                        'pet_id' => $pet->id,
                        'entry_date' => $day->toDateString(),
                    ],
                    [
                        'value_int' => $value,
                        'updated_by_user_id' => $user->id,
                    ]
                );
            }
        });

        $currentPets = $accessService->visibleCurrentPets($user, $habit);
        /** @var Collection<int, HabitEntry> $historicalEntries */
        $historicalEntries = $habit->entries()
            ->with('pet')
            ->whereDate('entry_date', $day->toDateString())
            ->get();
        $historicalEntries = $accessService->filterVisibleEntries($user, $habit, $historicalEntries);

        return $this->sendSuccessWithMeta(
            $presenter->dayEntries($user, $habit, $day, $historicalEntries, $currentPets),
            __('messages.habits.entries_saved')
        );
    }

    private function assertValueAllowed(Habit $habit, int $value): void
    {
        if ($habit->value_type === HabitValueType::YES_NO) {
            if (! in_array($value, [0, 1], true)) {
                throw ValidationException::withMessages([
                    'entries' => [__('messages.habits.invalid_yes_no_value')],
                ]);
            }

            return;
        }

        $min = (int) ($habit->scale_min ?? 0);
        $max = (int) ($habit->scale_max ?? 0);
        if ($value < $min || $value > $max) {
            throw ValidationException::withMessages([
                'entries' => [__('messages.habits.invalid_scale_value', ['min' => $min, 'max' => $max])],
            ]);
        }
    }
}
