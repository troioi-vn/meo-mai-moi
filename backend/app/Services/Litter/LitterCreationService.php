<?php

declare(strict_types=1);

namespace App\Services\Litter;

use App\Models\Litter;
use App\Models\PetType;
use App\Models\User;
use App\Models\WeightHistory;
use App\Services\Pet\PetCreationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Lang;

class LitterCreationService
{
    public function __construct(
        private readonly PetCreationService $petCreationService,
    ) {}

    /**
     * Create a litter plus all its member pets atomically.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(User $actor, array $data): Litter
    {
        if (! isset($data['members']) || ! is_array($data['members'])) {
            throw new \InvalidArgumentException('Members array is required');
        }

        $members = $data['members'];

        return DB::transaction(function () use ($actor, $data, $members): Litter {
            $petType = PetType::findOrFail($data['pet_type_id']);

            $litterName = $data['name'] ?? null;
            if (empty($litterName)) {
                $dateStr = now()->translatedFormat('j M Y');
                // Use translation for default name if available, fallback to English pattern
                $translated = __('litters.default_name', ['date' => $dateStr]);
                if ($translated === 'litters.default_name') {
                    $litterName = 'Litter, '.$dateStr;
                } else {
                    $litterName = $translated;
                }
            }

            $litter = Litter::create([
                'name' => $litterName,
                'pet_type_id' => $petType->id,
                'created_by' => $actor->id,
            ]);

            foreach ($members as $index => $member) {
                $memberIndex = $index + 1;

                $memberName = $member['name'] ?? null;
                if (empty($memberName)) {
                    $memberName = $this->generatePlaceholderName($petType, $memberIndex);
                }

                $petData = [
                    'name' => $memberName,
                    'sex' => $member['sex'] ?? 'not_specified',
                    'pet_type_id' => $petType->id,
                    'country' => $data['country'],
                    'state' => $data['state'] ?? null,
                    'city_id' => $data['city_id'] ?? null,
                    'address' => $data['address'] ?? null,
                    'description' => $data['description'] ?? '',
                    'birthday' => $data['birthday'] ?? null,
                    'birthday_year' => $data['birthday_year'] ?? null,
                    'birthday_month' => $data['birthday_month'] ?? null,
                    'birthday_day' => $data['birthday_day'] ?? null,
                    'birthday_precision' => $data['birthday_precision'] ?? 'unknown',
                    'group_id' => $data['group_id'] ?? null,
                ];

                $pet = $this->petCreationService->create($actor, $petData, true);

                // Assign litter_id without triggering mass assignment issues
                $pet->litter_id = $litter->id;
                $pet->save();

                if (isset($member['weight_kg']) && $member['weight_kg'] !== null && $member['weight_kg'] !== '') {
                    WeightHistory::create([
                        'pet_id' => $pet->id,
                        'weight_kg' => $member['weight_kg'],
                        'record_date' => today()->toDateString(),
                    ]);
                }
            }

            $litter->load(['pets', 'petType']);

            return $litter;
        });
    }

    private function generatePlaceholderName(PetType $petType, int $number): string
    {
        $slug = $petType->slug;

        // Try to find a translation for this pet type's placeholder, falling back to generic
        $key = "litters.placeholders.{$slug}";

        if (Lang::has($key)) {
            $template = __($key, ['number' => $number]);

            // If template still contains :number placeholder not replaced, replace manually
            if (str_contains($template, ':number')) {
                $template = str_replace(':number', (string) $number, $template);
            }

            // If template is numeric or empty, fallback
            if (! empty($template) && $template !== $key) {
                return $template;
            }
        }

        // Fallback: use pet type's own localized name plus number
        $typeName = $petType->name;
        if (! is_string($typeName) || trim($typeName) === '') {
            $typeName = 'Pet';
        }

        return trim((string) $typeName).' '.$number;
    }
}
