<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Litter;
use App\Models\PetType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Litter>
 */
class LitterFactory extends Factory
{
    protected $model = Litter::class;

    public function definition(): array
    {
        return [
            'name' => 'Litter, '.now()->format('j M Y'),
            'pet_type_id' => PetType::factory(),
            'created_by' => User::factory(),
        ];
    }
}
