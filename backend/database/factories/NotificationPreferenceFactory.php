<?php

namespace Database\Factories;

use App\Models\NotificationPreference;
use App\Models\User;
use App\Enums\NotificationType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\NotificationPreference>
 */
class NotificationPreferenceFactory extends Factory
{
    protected $model = NotificationPreference::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'notification_type' => $this->faker->randomElement(array_map(fn($case) => $case->value, NotificationType::cases())),
            'email_enabled' => $this->faker->boolean(80), // 80% chance of being enabled
            'in_app_enabled' => $this->faker->boolean(90), // 90% chance of being enabled
        ];
    }

    /**
     * Create preference with email notifications enabled.
     */
    public function emailEnabled(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_enabled' => true,
        ]);
    }

    /**
     * Create preference with email notifications disabled.
     */
    public function emailDisabled(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_enabled' => false,
        ]);
    }

    /**
     * Create preference with in-app notifications enabled.
     */
    public function inAppEnabled(): static
    {
        return $this->state(fn (array $attributes) => [
            'in_app_enabled' => true,
        ]);
    }

    /**
     * Create preference with in-app notifications disabled.
     */
    public function inAppDisabled(): static
    {
        return $this->state(fn (array $attributes) => [
            'in_app_enabled' => false,
        ]);
    }

    /**
     * Create preference with both email and in-app enabled.
     */
    public function allEnabled(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);
    }

    /**
     * Create preference with both email and in-app disabled.
     */
    public function allDisabled(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_enabled' => false,
            'in_app_enabled' => false,
        ]);
    }

    /**
     * Create preference for a specific user.
     */
    public function forUser(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $user->id,
        ]);
    }

    /**
     * Create preference for a specific notification type.
     */
    public function forType(NotificationType $type): static
    {
        return $this->state(fn (array $attributes) => [
            'notification_type' => $type->value,
        ]);
    }

    /**
     * Create preference for placement request response type.
     */
    public function placementRequestResponse(): static
    {
        return $this->forType(NotificationType::PLACEMENT_REQUEST_RESPONSE);
    }

    /**
     * Create preference for placement request accepted type.
     */
    public function placementRequestAccepted(): static
    {
        return $this->forType(NotificationType::PLACEMENT_REQUEST_ACCEPTED);
    }

    /**
     * Create preference for helper response accepted type.
     */
    public function helperResponseAccepted(): static
    {
        return $this->forType(NotificationType::HELPER_RESPONSE_ACCEPTED);
    }

    /**
     * Create preference for helper response rejected type.
     */
    public function helperResponseRejected(): static
    {
        return $this->forType(NotificationType::HELPER_RESPONSE_REJECTED);
    }

    /**
     * Create a complete set of preferences for a user (all notification types).
     */
    public function completeSetForUser(User $user): array
    {
        $preferences = [];
        foreach (NotificationType::cases() as $type) {
            $preferences[] = $this->forUser($user)->forType($type)->make();
        }
        return $preferences;
    }
}