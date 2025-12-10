<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // Collect unique country + city pairs from pets and helper profiles
        $pairs = collect();

        $pets = DB::table('pets')
            ->select('country', 'city')
            ->whereNotNull('country')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->get();

        foreach ($pets as $pet) {
            $pairs->push([$pet->country, $pet->city]);
        }

        $profiles = DB::table('helper_profiles')
            ->select('country', 'city')
            ->whereNotNull('country')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->get();

        foreach ($profiles as $profile) {
            $pairs->push([$profile->country, $profile->city]);
        }

        $uniquePairs = $pairs
            ->map(fn ($pair) => [
                'country' => strtoupper(trim($pair[0])),
                'city' => trim($pair[1]),
            ])
            ->filter(fn ($pair) => $pair['country'] !== '' && $pair['city'] !== '')
            ->unique(fn ($pair) => $pair['country'].'|'.Str::lower($pair['city']));

        foreach ($uniquePairs as $pair) {
            $country = $pair['country'];
            $name = $pair['city'];
            $slug = $this->generateUniqueSlug($name, $country);

            $existing = DB::table('cities')
                ->where('country', $country)
                ->whereRaw('LOWER(name) = ?', [Str::lower($name)])
                ->first();

            if (! $existing) {
                DB::table('cities')->insert([
                    'name' => $name,
                    'slug' => $slug,
                    'country' => $country,
                    'approved_at' => now(), // assume legacy data is trusted
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $cityLookup = DB::table('cities')
            ->select('id', 'name', 'country')
            ->get()
            ->reduce(function ($carry, $city) {
                $key = strtoupper($city->country).'|'.Str::lower($city->name);
                $carry[$key] = $city->id;

                return $carry;
            }, []);

        // Backfill pets
        DB::table('pets')
            ->whereNull('city_id')
            ->whereNotNull('country')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->orderBy('id')
            ->chunkById(500, function ($rows) use ($cityLookup) {
                foreach ($rows as $row) {
                    $key = strtoupper($row->country).'|'.Str::lower($row->city);
                    if (isset($cityLookup[$key])) {
                        DB::table('pets')
                            ->where('id', $row->id)
                            ->update(['city_id' => $cityLookup[$key]]);
                    }
                }
            });

        // Backfill helper profiles
        DB::table('helper_profiles')
            ->whereNull('city_id')
            ->whereNotNull('country')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->orderBy('id')
            ->chunkById(500, function ($rows) use ($cityLookup) {
                foreach ($rows as $row) {
                    $key = strtoupper($row->country).'|'.Str::lower($row->city);
                    if (isset($cityLookup[$key])) {
                        DB::table('helper_profiles')
                            ->where('id', $row->id)
                            ->update(['city_id' => $cityLookup[$key]]);
                    }
                }
            });
    }

    public function down(): void
    {
        // No rollback for backfill
    }

    private function generateUniqueSlug(string $name, string $country): string
    {
        $baseSlug = Str::slug($name);
        $slug = $baseSlug;
        $counter = 1;

        while (
            DB::table('cities')
                ->where('slug', $slug)
                ->where('country', strtoupper($country))
                ->exists()
        ) {
            $slug = $baseSlug.'-'.$counter;
            $counter++;
        }

        return $slug;
    }
};
