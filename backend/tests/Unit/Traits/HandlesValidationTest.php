<?php

declare(strict_types=1);

namespace Tests\Unit\Traits;

use App\Traits\HandlesValidation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use ReflectionMethod;
use Tests\TestCase;

class HandlesValidationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function sanitize_validation_input_redacts_sensitive_fields_recursively(): void
    {
        $validator = new class
        {
            use HandlesValidation;
        };

        $method = new ReflectionMethod($validator, 'sanitizeValidationInput');
        $method->setAccessible(true);

        $sanitized = $method->invoke($validator, [
            'email' => 'person@example.com',
            'code' => 'invitation-code',
            'token' => 'plain-token',
            'nested' => [
                'session_sig' => 'signature-value',
                'api_token' => 'nested-token',
                'label' => 'visible',
            ],
        ]);

        $this->assertSame('person@example.com', $sanitized['email']);
        $this->assertSame('[REDACTED]', $sanitized['code']);
        $this->assertSame('[REDACTED]', $sanitized['token']);
        $this->assertSame('[REDACTED]', $sanitized['nested']['session_sig']);
        $this->assertSame('[REDACTED]', $sanitized['nested']['api_token']);
        $this->assertSame('visible', $sanitized['nested']['label']);
    }
}

