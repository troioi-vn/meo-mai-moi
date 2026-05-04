<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ApiRequestLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApiRequestLog>
 */
class ApiRequestLogFactory extends Factory
{
    protected $model = ApiRequestLog::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'method' => fake()->randomElement(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
            'path' => '/api/'.fake()->slug(),
            'route_uri' => 'api/'.fake()->slug(),
            'status_code' => fake()->numberBetween(200, 500),
            'auth_mode' => fake()->randomElement(['session', 'token', 'guest']),
        ];
    }
}