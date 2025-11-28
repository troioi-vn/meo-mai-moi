<?php

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
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Log invitation-related requests for security monitoring
        if ($request->is('api/invitations*') || $request->is('api/waitlist*')) {
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

        // Additional security checks for waitlist requests
        if ($request->is('api/waitlist') && $request->isMethod('POST')) {
            $email = $request->input('email');

            // Check for suspicious email patterns
            if ($email && (
                str_contains($email, '+') && substr_count($email, '+') > 2 || // Multiple + signs
                preg_match('/\d{5,}/', $email) || // Long number sequences
                str_contains($email, 'test') && str_contains($email, 'example') // Test emails
            )) {
                Log::warning('Suspicious waitlist request - potentially fake email', [
                    'ip' => $request->ip(),
                    'email' => $email,
                    'user_agent' => $request->userAgent(),
                ]);
            }
        }

        return $next($request);
    }
}
