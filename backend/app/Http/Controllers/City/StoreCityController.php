<?php

declare(strict_types=1);

namespace App\Http\Controllers\City;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\User;
use App\Services\NotificationService;
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

        // Rate limiting: Check if user has reached the limit of 10 cities per 24 hours
        $citiesCreatedInLast24Hours = City::where('created_by', $request->user()->id)
            ->where('created_at', '>=', now()->subDay())
            ->count();

        if ($citiesCreatedInLast24Hours >= 10) {
            return $this->sendError('You have reached the limit of 10 cities per 24 hours. Please try again later.', 422);
        }

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
            'approved_at' => now(),
        ]);

        // Send notifications to all admin users
        $adminUsers = User::whereHas('roles', function ($query): void {
            $query->whereIn('name', ['admin', 'super_admin']);
        })->get();

        $notificationService = app(NotificationService::class);

        foreach ($adminUsers as $admin) {
            $notificationService->sendInApp($admin, 'city_created', [
                'message' => "New City created by {$request->user()->name}: {$city->name}",
                'link' => url("/admin/cities/{$city->id}/edit"),
                'city_id' => $city->id,
            ]);
        }

        return $this->sendSuccess($city, 201);
    }
}
