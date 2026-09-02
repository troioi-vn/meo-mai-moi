<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ImpersonationAudit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ImpersonationAudit>
 */
class ImpersonationAuditFactory extends Factory
{
    protected $model = ImpersonationAudit::class;

    public function definition(): array
    {
        return [
            'impersonator_user_id' => User::factory(),
            'target_user_id' => User::factory(),
            'token_hash' => hash('sha256', Str::random(64)),
            'status' => ImpersonationAudit::STATUS_ISSUED,
            'source' => 'admin_panel',
            'guard' => 'web',
            'impersonator_name' => fake()->name(),
            'impersonator_email' => fake()->safeEmail(),
            'target_name' => fake()->name(),
            'target_email' => fake()->safeEmail(),
            'back_to' => 'https://admin.example.com/',
            'issued_ip' => fake()->ipv4(),
            'expires_at' => now()->addMinute(),
            'metadata' => [],
        ];
    }
}
