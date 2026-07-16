<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\GroupRole;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GroupMembership>
 */
class GroupMembershipFactory extends Factory
{
    protected $model = GroupMembership::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'group_id' => Group::factory(),
            'user_id' => User::factory(),
            'role' => GroupRole::MEMBER,
            'invited_by_user_id' => null,
            'start_at' => now(),
            'end_at' => null,
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'end_at' => null,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => GroupRole::ADMIN,
        ]);
    }

    public function member(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => GroupRole::MEMBER,
        ]);
    }

    public function ended(): static
    {
        return $this->state(fn (array $attributes) => [
            'end_at' => now(),
        ]);
    }
}
