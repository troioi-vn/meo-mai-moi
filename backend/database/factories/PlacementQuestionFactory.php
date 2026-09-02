<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\PlacementQuestionStatus;
use App\Models\Pet;
use App\Models\PlacementQuestion;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PlacementQuestion>
 */
class PlacementQuestionFactory extends Factory
{
    protected $model = PlacementQuestion::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'pet_id' => Pet::factory(),
            'placement_request_id' => PlacementRequest::factory(),
            'asker_name' => fake()->firstName(),
            'asker_email' => null,
            'asker_email_confirmed_at' => null,
            'email_confirmation_token_hash' => null,
            'email_confirmation_expires_at' => null,
            'asker_ip' => fake()->ipv4(),
            'question' => fake()->sentence().'?',
            'question_locale' => 'en',
            'answer' => null,
            'answer_locale' => null,
            'answered_by_user_id' => null,
            'answered_by_name' => null,
            'answered_at' => null,
            'status' => PlacementQuestionStatus::PENDING,
            'published_at' => null,
            'hidden_at' => null,
        ];
    }

    public function published(): self
    {
        return $this->state(fn (): array => [
            'status' => PlacementQuestionStatus::PUBLISHED,
            'published_at' => now(),
        ]);
    }

    public function answered(?User $by = null): self
    {
        return $this->state(function () use ($by): array {
            $user = $by ?? User::factory()->create();

            return [
                'answer' => fake()->sentence(),
                'answer_locale' => 'en',
                'answered_by_user_id' => $user->id,
                'answered_by_name' => $user->name,
                'answered_at' => now(),
                'status' => PlacementQuestionStatus::PUBLISHED,
                'published_at' => now(),
            ];
        });
    }

    public function hidden(): self
    {
        return $this->state(fn (): array => [
            'status' => PlacementQuestionStatus::HIDDEN,
            'hidden_at' => now(),
        ]);
    }

    /**
     * An asker who gave an address and clicked the confirmation link.
     */
    public function withConfirmedEmail(string $email = 'asker@example.test'): self
    {
        return $this->state(fn (): array => [
            'asker_email' => $email,
            'asker_email_confirmed_at' => now(),
        ]);
    }

    /**
     * An asker who gave an address but never confirmed it.
     */
    public function withPendingEmail(string $email = 'asker@example.test', string $token = 'raw-token'): self
    {
        return $this->state(fn (): array => [
            'asker_email' => $email,
            'asker_email_confirmed_at' => null,
            'email_confirmation_token_hash' => hash('sha256', $token),
            'email_confirmation_expires_at' => now()->addHours(48),
        ]);
    }
}
