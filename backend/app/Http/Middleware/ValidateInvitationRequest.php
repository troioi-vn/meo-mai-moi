<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ValidateInvitationRequest
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Log invitation-related requests for security monitoring
        if ($request->is('api/invitations*')) {
            Log::info('Invitation system request', [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'path' => $request->path(),
                'method' => $request->method(),
                'user_id' => auth()->id(),
            ]);
        }

        // Additional security checks for invitation creation
        if ($request->is('api/invitations') && $request->isMethod('POST')) {
            // Check for suspicious patterns
            $userAgent = $request->userAgent();
            if (empty($userAgent) || strlen($userAgent) < 10) {
                Log::warning('Suspicious invitation request - invalid user agent', [
                    'ip' => $request->ip(),
                    'user_agent' => $userAgent,
                    'user_id' => auth()->id(),
                ]);
            }
        }

        return $next($request);
    }
}
