<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\NotificationTemplate;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NotificationTemplate>
 */
class NotificationTemplateFactory extends Factory
{
    protected $model = NotificationTemplate::class;

    public function definition(): array
    {
        return [
            'type' => fake()->slug(2),
            'channel' => fake()->randomElement(['email', 'in_app', 'telegram']),
            'locale' => fake()->randomElement(['en', 'ru', 'uk', 'vi']),
            'subject_template' => fake()->sentence(),
            'body_template' => fake()->paragraph(),
            'engine' => fake()->randomElement(['blade', 'twig', 'plain']),
            'status' => fake()->randomElement(['active', 'inactive', 'draft']),
            'version' => fake()->numberBetween(1, 5),
            'updated_by_user_id' => User::factory(),
        ];
    }
}
