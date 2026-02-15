<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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
            'password' => static::$password ??= Hash::make('Password1secure'),
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

        if ($this->hasColumn('telegram_chat_id')) {
            $attributes['telegram_chat_id'] = null;
        }

        if ($this->hasColumn('telegram_user_id')) {
            $attributes['telegram_user_id'] = null;
        }

        if ($this->hasColumn('telegram_username')) {
            $attributes['telegram_username'] = null;
        }

        if ($this->hasColumn('telegram_first_name')) {
            $attributes['telegram_first_name'] = null;
        }

        if ($this->hasColumn('telegram_last_name')) {
            $attributes['telegram_last_name'] = null;
        }

        if ($this->hasColumn('telegram_photo_url')) {
            $attributes['telegram_photo_url'] = null;
        }

        if ($this->hasColumn('telegram_last_authenticated_at')) {
            $attributes['telegram_last_authenticated_at'] = null;
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
