<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\WeightHistory;
use App\Services\Offline\OfflineVersionService;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OfflineVersionServiceTest extends TestCase
{
    private OfflineVersionService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(OfflineVersionService::class);
    }

    #[Test]
    public function it_treats_missing_base_version_as_a_match(): void
    {
        $weight = (new WeightHistory())->forceFill([
            'updated_at' => Carbon::parse('2024-01-01T00:00:00Z'),
        ]);

        $this->assertTrue($this->service->matchesBaseVersion($weight, null));
        $this->assertTrue($this->service->matchesBaseVersion($weight, ''));
    }

    #[Test]
    public function it_matches_the_current_updated_at_version(): void
    {
        $weight = (new WeightHistory())->forceFill([
            'updated_at' => Carbon::parse('2024-01-01T00:00:00Z'),
        ]);

        $this->assertTrue(
            $this->service->matchesBaseVersion($weight, $this->service->serializeVersion($weight))
        );
    }

    #[Test]
    public function it_rejects_a_stale_base_version(): void
    {
        $weight = (new WeightHistory())->forceFill([
            'updated_at' => Carbon::parse('2024-01-01T00:00:00Z'),
        ]);
        $staleVersion = $this->service->serializeVersion($weight);

        $weight->forceFill([
            'updated_at' => Carbon::parse('2024-02-01T00:00:00Z'),
        ]);

        $this->assertFalse($this->service->matchesBaseVersion($weight, $staleVersion));
    }
}
