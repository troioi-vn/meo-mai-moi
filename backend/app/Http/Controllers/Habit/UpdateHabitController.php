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
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/habits/{habit}',
    summary: 'Update a habit',
    tags: ['Habits'],
    security: [['sanctum' => []]],
    parameters: [new OA\Parameter(name: 'habit', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'name', type: 'string'),
                new OA\Property(property: 'value_type', type: 'string', enum: ['yes_no', 'integer_scale']),
                new OA\Property(property: 'scale_min', type: 'integer', nullable: true),
                new OA\Property(property: 'scale_max', type: 'integer', nullable: true),
                new OA\Property(property: 'day_summary_mode', type: 'string', enum: ['average_scored_pets', 'average_all_pets', 'sum']),
                new OA\Property(property: 'share_with_coowners', type: 'boolean'),
                new OA\Property(property: 'reminder_enabled', type: 'boolean'),
                new OA\Property(property: 'reminder_time', type: 'string', nullable: true),
                new OA\Property(property: 'reminder_weekdays', type: 'array', items: new OA\Items(type: 'integer')),
                new OA\Property(property: 'pet_ids', type: 'array', items: new OA\Items(type: 'integer')),
            ]
        )
    ),
    responses: [new OA\Response(response: 200, description: 'Habit updated')]
)]
class UpdateHabitController extends Controller
{
    use ApiResponseTrait;
    use HandlesValidation;

    public function __invoke(Request $request, Habit $habit, HabitPresenter $presenter)
    {
        $this->authorize('update', $habit);
        $user = $request->user();

        $data = $this->validateWithErrorHandling($request, [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'value_type' => ['sometimes', 'required', Rule::in(array_column(HabitValueType::cases(), 'value'))],
            'scale_min' => ['nullable', 'integer'],
            'scale_max' => ['nullable', 'integer', 'gte:scale_min'],
            'day_summary_mode' => ['nullable', Rule::in(array_column(HabitDaySummaryMode::cases(), 'value'))],
            'share_with_coowners' => ['sometimes', 'boolean'],
            'reminder_enabled' => ['sometimes', 'boolean'],
            'reminder_time' => ['nullable', 'date_format:H:i'],
            'reminder_weekdays' => ['nullable', 'array'],
            'reminder_weekdays.*' => ['integer', 'between:0,6', 'distinct'],
            'pet_ids' => ['sometimes', 'array', 'min:1'],
            'pet_ids.*' => ['integer', 'distinct', 'exists:pets,id'],
        ]);

        $nextValueType = $data['value_type'] ?? $habit->value_type->value;
        if ($nextValueType === HabitValueType::INTEGER_SCALE->value) {
            $scaleMin = $data['scale_min'] ?? $habit->scale_min;
            $scaleMax = $data['scale_max'] ?? $habit->scale_max;
            if ($scaleMin === null || $scaleMax === null) {
                return $this->sendError(__('messages.habits.integer_scale_requires_bounds'), 422);
            }
        }

        if (($data['reminder_enabled'] ?? $habit->reminder_enabled) && (($data['reminder_time'] ?? $habit->reminder_time) === null)) {
            return $this->sendError(__('messages.habits.reminder_time_required'), 422);
        }

        if (array_key_exists('pet_ids', $data) && (int) $habit->created_by !== (int) $user->id) {
            return $this->sendError(__('messages.habits.only_creator_can_change_pet_list'), 403);
        }

        if (array_key_exists('pet_ids', $data)) {
            $petIds = array_values(array_map('intval', $data['pet_ids']));
            $ownedPetCount = Pet::query()
                ->whereIn('id', $petIds)
                ->get()
                ->filter(fn (Pet $pet) => $pet->isOwnedBy($user))
                ->count();

            if ($ownedPetCount !== count($petIds)) {
                return $this->sendError(__('messages.habits.must_own_all_selected_pets'), 422);
            }
        }

        DB::transaction(function () use ($habit, $data): void {
            $habit->fill([
                'name' => $data['name'] ?? $habit->name,
                'value_type' => $data['value_type'] ?? $habit->value_type,
                'scale_min' => array_key_exists('scale_min', $data) ? $data['scale_min'] : $habit->scale_min,
                'scale_max' => array_key_exists('scale_max', $data) ? $data['scale_max'] : $habit->scale_max,
                'day_summary_mode' => $data['day_summary_mode'] ?? $habit->day_summary_mode,
                'share_with_coowners' => $data['share_with_coowners'] ?? $habit->share_with_coowners,
                'reminder_enabled' => $data['reminder_enabled'] ?? $habit->reminder_enabled,
                'reminder_time' => array_key_exists('reminder_time', $data) ? $data['reminder_time'] : $habit->reminder_time,
                'reminder_weekdays' => array_key_exists('reminder_weekdays', $data) ? $data['reminder_weekdays'] : $habit->reminder_weekdays,
            ]);

            if (($data['value_type'] ?? $habit->value_type->value) === HabitValueType::YES_NO->value) {
                $habit->scale_min = null;
                $habit->scale_max = null;
            }

            $habit->save();

            if (array_key_exists('pet_ids', $data)) {
                $habit->pets()->sync(array_values(array_map('intval', $data['pet_ids'])));
            }
        });

        $habit->load('pets');

        return $this->sendSuccessWithMeta(
            $presenter->habit($user, $habit),
            __('messages.habits.updated')
        );
    }
}
