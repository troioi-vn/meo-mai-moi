<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * DEBUG: Middleware to log all login-related requests.
 * This helps trace issues with the authentication flow.
 */
class DebugLoginRequests
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $path = $request->path();
        $method = $request->method();

        // Log all POST requests to login, register, password reset
        if ($method === 'POST' && in_array($path, ['login', 'register', 'reset-password', 'forgot-password'])) {
            $sessionCookieName = config('session.cookie');
            $xsrfCookieName = config('sanctum.cookie', 'XSRF-TOKEN');
            
            Log::info('DEBUG: Auth request START', [
                'path' => $path,
                'method' => $method,
                'email' => $request->input('email'),
                'has_csrf_header' => $request->hasHeader('X-XSRF-TOKEN'),
                'csrf_header_length' => strlen($request->header('X-XSRF-TOKEN') ?? ''),
                'has_session_cookie' => $request->hasCookie($sessionCookieName),
                'has_xsrf_cookie' => $request->hasCookie($xsrfCookieName),
                'content_type' => $request->header('Content-Type'),
                'accept' => $request->header('Accept'),
                'origin' => $request->header('Origin'),
                'referer' => $request->header('Referer'),
                'is_already_authenticated' => Auth::check(),
                'authenticated_user_id' => Auth::id(),
            ]);

            // Log session state if available
            if ($request->hasSession()) {
                $session = $request->session();
                Log::info('DEBUG: Auth request SESSION state', [
                    'session_id_prefix' => substr($session->getId(), 0, 10) . '...',
                    'session_started' => $session->isStarted(),
                    'has_login_id' => $session->has('login.id'),
                    'login_id' => $session->get('login.id'),
                    'session_keys' => array_keys($session->all()),
                ]);
            }
        }

        $response = $next($request);

        // Log response for auth requests
        if ($method === 'POST' && in_array($path, ['login', 'register', 'reset-password', 'forgot-password'])) {
            $setCookie = $response->headers->get('Set-Cookie');
            
            Log::info('DEBUG: Auth request END', [
                'path' => $path,
                'status' => $response->getStatusCode(),
                'has_set_cookie' => ! empty($setCookie),
                'is_authenticated_after' => Auth::check(),
                'authenticated_user_after' => Auth::id(),
                'response_content_type' => $response->headers->get('Content-Type'),
            ]);
            
            // Log response body for errors
            if ($response->getStatusCode() >= 400) {
                $content = $response->getContent();
                Log::info('DEBUG: Auth error response body', [
                    'body' => strlen($content) > 500 ? substr($content, 0, 500) . '...' : $content,
                ]);
            }
        }

        return $response;
    }
}

