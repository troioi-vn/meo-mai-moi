<?php

namespace Database\Factories;


use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Jetstream\Features;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $attributes = [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];

        // Only add Jetstream columns if they exist in the database
        if ($this->hasColumn('two_factor_secret')) {
            $attributes['two_factor_secret'] = null;
        }

        if ($this->hasColumn('two_factor_recovery_codes')) {
            $attributes['two_factor_recovery_codes'] = null;
        }

        if ($this->hasColumn('profile_photo_path')) {
            $attributes['profile_photo_path'] = null;
        }

        if ($this->hasColumn('current_team_id')) {
            $attributes['current_team_id'] = null;
        }

        return $attributes;
    }

    /**
     * Check if a column exists in the users table
     */
    private function hasColumn(string $column): bool
    {
        try {
            return \Schema::hasColumn('users', $column);
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }


}
