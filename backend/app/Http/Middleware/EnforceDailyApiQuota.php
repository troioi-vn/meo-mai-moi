<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\SettingsService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class EnforceDailyApiQuota
{
    public function __construct(private readonly SettingsService $settingsService) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('OPTIONS')) {
            return $next($request);
        }

        if (app()->environment(['development', 'local'])) {
            return $next($request);
        }

        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();

        if (! $user instanceof User || $user->hasRole('premium')) {
            return $next($request);
        }

        $dailyLimit = $this->settingsService->getRegularDailyApiQuota();
        $nowUtc = Carbon::now('UTC');
        $key = $this->quotaKey((int) $user->id, $nowUtc->toDateString());
        $used = RateLimiter::attempts($key);

        if ($used >= $dailyLimit) {
            $resetAtUtc = $nowUtc->copy()->endOfDay()->addSecond();
            $message = __('messages.api.daily_quota_exceeded', [
                'limit' => $dailyLimit,
                'reset' => $resetAtUtc->format('Y-m-d H:i:s').' UTC',
            ]);

            return response()->json([
                'success' => false,
                'data' => [
                    'error_code' => 'API_DAILY_QUOTA_EXCEEDED',
                    'quota' => [
                        'limit' => $dailyLimit,
                        'used' => $dailyLimit,
                        'remaining' => 0,
                        'reset_at_utc' => $resetAtUtc->toIso8601String(),
                    ],
                ],
                'message' => $message,
                'error' => $message,
            ], 429);
        }

        $secondsUntilUtcReset = (int) $nowUtc->diffInSeconds($nowUtc->copy()->endOfDay()) + 1;
        RateLimiter::hit($key, $secondsUntilUtcReset);

        return $next($request);
    }

    private function quotaKey(int $userId, string $utcDate): string
    {
        return "api-daily:{$userId}:{$utcDate}";
    }
}
