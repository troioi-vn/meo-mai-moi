<?php

namespace Database\Factories;

use App\Enums\ChatMessageType;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ChatMessageFactory extends Factory
{
    protected $model = ChatMessage::class;

    public function definition(): array
    {
        return [
            'chat_id' => Chat::factory(),
            'sender_id' => User::factory(),
            'type' => ChatMessageType::TEXT,
            'content' => $this->faker->sentence(),
        ];
    }
}
