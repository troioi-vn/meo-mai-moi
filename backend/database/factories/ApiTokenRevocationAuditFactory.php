<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ApiTokenRevocationAudit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApiTokenRevocationAudit>
 */
class ApiTokenRevocationAuditFactory extends Factory
{
    protected $model = ApiTokenRevocationAudit::class;

    public function definition(): array
    {
        return [
            'actor_user_id' => User::factory(),
            'target_user_id' => User::factory(),
            'token_id' => (string) fake()->randomNumber(),
            'token_name' => fake()->word(),
            'tokenable_type' => User::class,
            'tokenable_id' => (string) fake()->randomNumber(),
            'token_abilities' => ['*'],
            'token_last_used_at' => fake()->optional()->dateTime(),
            'source' => fake()->randomElement(['admin', 'self', 'system']),
            'actor_name' => fake()->name(),
            'actor_email' => fake()->safeEmail(),
            'target_name' => fake()->name(),
            'target_email' => fake()->safeEmail(),
            'metadata' => ['reason' => fake()->sentence()],
        ];
    }
}
