<?php

declare(strict_types=1);

namespace App\Http\Controllers\Habit;

use App\Enums\HabitDaySummaryMode;
use App\Enums\HabitValueType;
use App\Http\Controllers\Controller;
use App\Models\Habit;
use App\Models\Pet;
use App\Services\HabitPresenter;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/habits',
    summary: 'Create a habit',
    tags: ['Habits'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['name', 'value_type', 'pet_ids'],
            properties: [
                new OA\Property(property: 'name', type: 'string'),
                new OA\Property(property: 'value_type', type: 'string', enum: ['yes_no', 'integer_scale']),
                new OA\Property(property: 'scale_min', type: 'integer', nullable: true),
                new OA\Property(property: 'scale_max', type: 'integer', nullable: true),
                new OA\Property(property: 'day_summary_mode', type: 'string', enum: ['average_scored_pets', 'average_all_pets', 'sum']),
                new OA\Property(property: 'share_with_coowners', type: 'boolean'),
                new OA\Property(property: 'reminder_enabled', type: 'boolean'),
                new OA\Property(property: 'reminder_time', type: 'string', nullable: true, example: '20:00'),
                new OA\Property(property: 'reminder_weekdays', type: 'array', items: new OA\Items(type: 'integer')),
                new OA\Property(property: 'pet_ids', type: 'array', items: new OA\Items(type: 'integer')),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'Habit created',
            content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Habit')])
        ),
    ]
)]
class StoreHabitController extends Controller
{
    use ApiResponseTrait;
    use HandlesValidation;

    public function __invoke(Request $request, HabitPresenter $presenter)
    {
        $user = $request->user();
        $data = $this->validateHabitPayload($request);
        $petIds = $this->normalizePetIds($data['pet_ids']);

        $ownedPetCount = Pet::query()
            ->whereIn('id', $petIds)
            ->get()
            ->filter(fn (Pet $pet) => $pet->isOwnedBy($user))
            ->count();

        if ($ownedPetCount !== count($petIds)) {
            return $this->sendError(__('messages.habits.must_own_all_selected_pets'), 422);
        }

        $habit = DB::transaction(function () use ($user, $data, $petIds): Habit {
            $habit = Habit::create([
                'created_by' => $user->id,
                'name' => $data['name'],
                'value_type' => $data['value_type'],
                'scale_min' => $data['value_type'] === HabitValueType::INTEGER_SCALE->value ? $data['scale_min'] : null,
                'scale_max' => $data['value_type'] === HabitValueType::INTEGER_SCALE->value ? $data['scale_max'] : null,
                'day_summary_mode' => $data['day_summary_mode'] ?? HabitDaySummaryMode::AVERAGE_SCORED_PETS->value,
                'share_with_coowners' => $data['share_with_coowners'] ?? false,
                'reminder_enabled' => $data['reminder_enabled'] ?? false,
                'reminder_time' => $data['reminder_time'] ?? null,
                'reminder_weekdays' => $data['reminder_weekdays'] ?? null,
            ]);

            $habit->pets()->sync($petIds);

            return $habit->load('pets');
        });

        return $this->sendSuccessWithMeta(
            $presenter->habit($user, $habit),
            __('messages.habits.created'),
            201
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function validateHabitPayload(Request $request): array
    {
        $data = $this->validateWithErrorHandling($request, [
            'name' => ['required', 'string', 'max:120'],
            'value_type' => ['required', Rule::in(array_column(HabitValueType::cases(), 'value'))],
            'scale_min' => ['nullable', 'integer'],
            'scale_max' => ['nullable', 'integer', 'gte:scale_min'],
            'day_summary_mode' => ['nullable', Rule::in(array_column(HabitDaySummaryMode::cases(), 'value'))],
            'share_with_coowners' => ['nullable', 'boolean'],
            'reminder_enabled' => ['nullable', 'boolean'],
            'reminder_time' => ['nullable', 'date_format:H:i'],
            'reminder_weekdays' => ['nullable', 'array'],
            'reminder_weekdays.*' => ['integer', 'between:0,6', 'distinct'],
            'pet_ids' => ['required', 'array', 'min:1'],
            'pet_ids.*' => ['integer', 'distinct', 'exists:pets,id'],
        ]);

        $this->ensureScaleRules($data);
        $this->ensureReminderRules($data);

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function ensureScaleRules(array $data): void
    {
        if (($data['value_type'] ?? null) === HabitValueType::INTEGER_SCALE->value) {
            if (! isset($data['scale_min'], $data['scale_max'])) {
                throw ValidationException::withMessages([
                    'scale_min' => [__('messages.habits.integer_scale_requires_bounds')],
                ]);
            }

            return;
        }

        if (($data['scale_min'] ?? null) !== null || ($data['scale_max'] ?? null) !== null) {
            throw ValidationException::withMessages([
                'scale_min' => [__('messages.habits.yes_no_cannot_define_bounds')],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function ensureReminderRules(array $data): void
    {
        if (! ($data['reminder_enabled'] ?? false)) {
            return;
        }

        if (! isset($data['reminder_time'])) {
            throw ValidationException::withMessages([
                'reminder_time' => [__('messages.habits.reminder_time_required')],
            ]);
        }
    }

    /**
     * @param  array<int, mixed>  $petIds
     * @return array<int, int>
     */
    private function normalizePetIds(array $petIds): array
    {
        return array_values(array_map('intval', $petIds));
    }
}
