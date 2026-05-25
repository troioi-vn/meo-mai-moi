<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Habit;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

class HabitTimezone
{
    public function forHabit(Habit $habit): string
    {
        return $this->normalize($habit->timezone);
    }

    public function today(Habit $habit, CarbonInterface|string|null $now = null): CarbonImmutable
    {
        return $this->now($habit, $now)->startOfDay();
    }

    public function now(Habit $habit, CarbonInterface|string|null $now = null): CarbonImmutable
    {
        return $this->from($now)->setTimezone($this->forHabit($habit));
    }

    public function parseDate(Habit $habit, string $date): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('Y-m-d', $date, $this->forHabit($habit))->startOfDay();
    }

    private function from(CarbonInterface|string|null $value): CarbonImmutable
    {
        if ($value instanceof CarbonInterface) {
            return CarbonImmutable::instance($value);
        }

        if (is_string($value)) {
            return CarbonImmutable::parse($value);
        }

        return CarbonImmutable::now();
    }

    private function normalize(?string $timezone): string
    {
        return $timezone ?: (string) config('app.timezone', 'UTC');
    }
}