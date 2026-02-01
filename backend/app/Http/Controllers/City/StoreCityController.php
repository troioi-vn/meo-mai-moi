<?php

declare(strict_types=1);

namespace App\Http\Controllers\City;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\User;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

class StoreCityController extends Controller
{
    use ApiResponseTrait;

    #[OA\Post(
        path: '/api/cities',
        summary: 'Create a new city',
        tags: ['Cities'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name', 'country'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', maxLength: 100, example: 'Hanoi'),
                    new OA\Property(property: 'country', type: 'string', minLength: 2, maxLength: 2, example: 'VN'),
                    new OA\Property(property: 'description', type: 'string', maxLength: 500, example: 'Capital city of Vietnam'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'City created successfully',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [
                        new OA\Property(property: 'data', ref: '#/components/schemas/City'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 422, description: 'Validation error or limit reached'),
        ]
    )]
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
            return $this->sendError(__('messages.city.limit_reached'), 422);
        }

        // Unique name per country
        $existingByName = City::where('name', $validated['name'])
            ->where('country', $country)
            ->first();

        if ($existingByName) {
            return $this->sendError(__('messages.city.already_exists'), 422);
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
            try {
                $notificationService->sendInApp($admin, 'city_created', [
                    'message' => "New City created by {$request->user()->name}: {$city->name}",
                    'link' => url("/admin/cities/{$city->id}/edit"),
                    'city_id' => $city->id,
                ]);
            } catch (\Throwable $e) {
                Log::warning('Failed to send city_created notification to admin', [
                    'admin_id' => $admin->id,
                    'city_id' => $city->id,
                    'exception' => $e,
                ]);

                continue;
            }
        }

        return $this->sendSuccess($city, 201);
    }
}
