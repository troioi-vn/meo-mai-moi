<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\ErrorEventService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ErrorEventFingerprintTest extends TestCase
{
    #[Test]
    public function occurrence_specific_values_are_normalized_without_collapsing_different_bugs(): void
    {
        $service = app(ErrorEventService::class);
        $first = $service->recordFrontend([
            'message' => 'Pet 123 with UUID 9f8c2b1a-54b8-4be9-aabc-f0e5ae64a111 was not found at 2026-08-13T10:00:00Z',
            'exception_class' => 'TypeError',
            'stack' => "TypeError\n at PetCard (/assets/app.js:100:20)",
            'route' => '/pets/123',
        ]);
        $second = $service->recordFrontend([
            'message' => 'Pet 987 with UUID 647d13c2-f84c-42bd-8ba5-9a2063622999 was not found at 2026-08-13T11:00:00Z',
            'exception_class' => 'TypeError',
            'stack' => "TypeError\n at PetCard (/assets/app.js:400:80)",
            'route' => '/pets/987',
        ]);
        $different = $service->recordFrontend([
            'message' => 'Pet could not be saved',
            'exception_class' => 'TypeError',
            'stack' => "TypeError\n at SaveButton (/assets/app.js:400:80)",
            'route' => '/pets/987',
        ]);

        $this->assertNotNull($first);
        $this->assertNotNull($second);
        $this->assertNotNull($different);
        $this->assertSame($first->fingerprint, $second->fingerprint);
        $this->assertNotSame($first->fingerprint, $different->fingerprint);
    }
}
