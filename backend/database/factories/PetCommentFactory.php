<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Pet;
use App\Models\PetComment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PetComment>
 */
class PetCommentFactory extends Factory
{
    protected $model = PetComment::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'pet_id' => Pet::factory(),
            'comment' => fake()->paragraph(),
        ];
    }
}
