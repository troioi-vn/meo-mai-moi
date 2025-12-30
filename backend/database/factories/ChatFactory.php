<?php

namespace Database\Factories;

use App\Enums\ChatType;
use App\Models\Chat;
use Illuminate\Database\Eloquent\Factories\Factory;

class ChatFactory extends Factory
{
    protected $model = Chat::class;

    public function definition(): array
    {
        return [
            'type' => ChatType::DIRECT,
            'contextable_type' => null,
            'contextable_id' => null,
        ];
    }

    public function direct(): self
    {
        return $this->state(fn (array $attributes) => [
            'type' => ChatType::DIRECT,
        ]);
    }
}
