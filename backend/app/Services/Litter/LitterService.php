<?php

declare(strict_types=1);

namespace App\Services\Litter;

use App\Models\Litter;
use App\Models\Pet;
use Illuminate\Support\Facades\DB;

class LitterService
{
    public function detachMember(Litter $litter, Pet $pet): void
    {
        DB::transaction(function () use ($litter, $pet): void {
            $freshPet = Pet::query()->where('id', $pet->id)->lockForUpdate()->first();
            if (! $freshPet || (int) $freshPet->litter_id !== (int) $litter->id) {
                return;
            }

            Pet::query()->where('id', $pet->id)->update(['litter_id' => null]);

            $remaining = Pet::query()->where('litter_id', $litter->id)->count();

            if ($remaining < 2) {
                Pet::query()->where('litter_id', $litter->id)->update(['litter_id' => null]);

                $freshLitter = Litter::query()->where('id', $litter->id)->lockForUpdate()->first();
                if ($freshLitter) {
                    $freshLitter->delete();
                }
            }
        });
    }

    public function dissolve(Litter $litter): void
    {
        DB::transaction(function () use ($litter): void {
            Pet::query()->where('litter_id', $litter->id)->update(['litter_id' => null]);

            $freshLitter = Litter::query()->where('id', $litter->id)->lockForUpdate()->first();
            if ($freshLitter) {
                $freshLitter->delete();
            }
        });
    }

    public function handlePetDeletion(Pet $pet): void
    {
        $litterId = $pet->litter_id;

        if ($litterId === null) {
            return;
        }

        DB::transaction(function () use ($litterId): void {
            $litter = Litter::query()->where('id', $litterId)->lockForUpdate()->first();

            if (! $litter) {
                return;
            }

            $remaining = Pet::query()->where('litter_id', $litter->id)->count();

            if ($remaining < 2) {
                Pet::query()->where('litter_id', $litter->id)->update(['litter_id' => null]);
                $litter->delete();
            }
        });
    }
}
