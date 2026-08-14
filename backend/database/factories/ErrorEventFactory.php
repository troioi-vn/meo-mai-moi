<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ErrorEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ErrorEvent> */
class ErrorEventFactory extends Factory
{
    protected $model = ErrorEvent::class;

    public function definition(): array
    {
        $message = fake()->sentence();

        return [
            'source' => 'backend',
            'fingerprint' => hash('sha256', $message),
            'message' => $message,
            'exception_class' => \RuntimeException::class,
            'stack' => fake()->text(),
            'route' => 'api/test',
            'method' => 'GET',
            'status_code' => 500,
            'app_version' => config('version.api'),
            'context' => null,
            'occurred_at' => now(),
        ];
    }
}
