<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\OptionalAuth;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
    // For API requests, don't redirect unauthenticated users to a login route.
    // Returning null here ensures a 401 JSON response instead of an HTML redirect.
    $middleware->redirectGuestsTo(fn () => null);

        $middleware->alias([
            'admin' => AdminMiddleware::class,
            'optional.auth' => OptionalAuth::class,
        ]);

    // Note: Avoid trusting all proxies by default, which can trigger null IP edge cases
    // in Symfony's IpUtils when REMOTE_ADDR is missing. If needed in production behind
    // a real proxy/load balancer, set concrete IPs/CIDRs here. For local/container use,
    // don't trust proxies to keep behavior simple and robust.
    // $middleware->trustProxies(at: ['127.0.0.1', '::1']);

        $middleware->api(append: [
            Illuminate\Http\Middleware\HandleCors::class,
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->web([
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Always render JSON for API routes
        $exceptions->shouldRenderJsonWhen(function (Request $request, Throwable $e) {
            return $request->is('api/*');
        });

        // Ensure API requests return 401 JSON instead of redirecting to a non-existent login route
    $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
        return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });
    })
    ->withProviders([
        App\Providers\ImageServiceProvider::class,
    ])->create();
