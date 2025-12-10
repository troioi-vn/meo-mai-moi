<?php

namespace App\Http\Controllers\City;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StoreCityController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'country' => 'required|string|size:2',
            'description' => 'nullable|string|max:500',
        ]);

        $country = strtoupper($validated['country']);
        $slug = Str::slug($validated['name']);

        // Unique name per country
        $existingByName = City::where('name', $validated['name'])
            ->where('country', $country)
            ->first();

        if ($existingByName) {
            return $this->sendError('A city with this name already exists for this country.', 422);
        }

        $existingBySlug = City::where('slug', $slug)
            ->where('country', $country)
            ->first();

        if ($existingBySlug) {
            $counter = 1;
            $baseSlug = $slug;
            while ($existingBySlug) {
                $slug = $baseSlug.'-'.$counter;
                $existingBySlug = City::where('slug', $slug)
                    ->where('country', $country)
                    ->first();
                $counter++;
            }
        }

        $city = City::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'country' => $country,
            'description' => $validated['description'] ?? null,
            'created_by' => $request->user()->id,
            'approved_at' => null,
        ]);

        return $this->sendSuccess($city, 201);
    }
}

