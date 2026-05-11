<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;

class OwnerWeightHistoryService
{
    public function syncTareWeight(User $user, float|int|null $tareWeightKg, string $recordDate): void
    {
        if ($tareWeightKg === null) {
            return;
        }

        $user->ownerWeightHistories()->updateOrCreate(
            ['record_date' => $recordDate],
            ['weight_kg' => round((float) $tareWeightKg, 2)]
        );
    }
}