<?php

namespace App\Services\Waitlist;

use App\Models\WaitlistEntry;

class WaitlistStatsCalculator
{
    /**
     * Get waitlist statistics.
     */
    public function getWaitlistStats(): array
    {
        $total = WaitlistEntry::count();
        $invited = WaitlistEntry::invited()->count();

        return [
            'total' => $total,
            'pending' => WaitlistEntry::pending()->count(),
            'invited' => $invited,
            'conversion_rate' => $this->calculateConversionRate($total, $invited),
        ];
    }

    /**
     * Get recent waitlist activity.
     */
    public function getRecentActivity(int $days = 7): array
    {
        $startDate = now()->subDays($days);

        return [
            'new_entries' => WaitlistEntry::where('created_at', '>=', $startDate)->count(),
            'invitations_sent' => WaitlistEntry::where('invited_at', '>=', $startDate)->count(),
            'daily_breakdown' => $this->getDailyBreakdown($days),
        ];
    }

    private function calculateConversionRate(int $total, int $invited): float
    {
        return $total === 0 ? 0.0 : round($invited / $total * 100, 2);
    }

    private function getDailyBreakdown(int $days): array
    {
        $breakdown = [];

        for ($i = 0; $i < $days; $i++) {
            $date = now()->subDays($i)->toDateString();

            $breakdown[] = [
                'date' => $date,
                'new_entries' => WaitlistEntry::whereDate('created_at', $date)->count(),
                'invitations_sent' => WaitlistEntry::whereDate('invited_at', $date)->count(),
            ];
        }

        return array_reverse($breakdown);
    }
}
