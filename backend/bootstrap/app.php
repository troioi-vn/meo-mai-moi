<?php

use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\EnsureUserNotBanned;
use App\Http\Middleware\OptionalAuth;
use App\Http\Middleware\SetLocaleMiddleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);

        $middleware->web(append: [
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        // For API requests, don't redirect unauthenticated users to a login route.
        // Returning null here ensures a 401 JSON response instead of an HTML redirect.
        $middleware->redirectGuestsTo(fn () => null);

        $middleware->alias([
            'admin' => AdminMiddleware::class,
            'not.banned' => EnsureUserNotBanned::class,
            'optional.auth' => OptionalAuth::class,
            'validate.invitation' => \App\Http\Middleware\ValidateInvitationRequest::class,
            'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
        ]);

        // Note: Avoid trusting all proxies by default, which can trigger null IP edge cases
        // in Symfony's IpUtils when REMOTE_ADDR is missing. If needed in production behind
        // a real proxy/load balancer, set concrete IPs/CIDRs here. For local/container use,
        // it's safe to trust the local nginx reverse proxy so Laravel reads X-Forwarded-* headers.
        // Trust Docker network and common proxy IPs (172.x.x.x is Docker's default bridge network)
        $middleware->trustProxies(at: ['127.0.0.1', '::1', '172.16.0.0/12', '192.168.0.0/16', '10.0.0.0/8']);

        $middleware->statefulApi();

        // Set locale from Accept-Language header or user preference
        $middleware->api(append: [SetLocaleMiddleware::class]);

        // Append noindex headers for non-production / dev subdomains to reduce risk of Safe Browsing flags
        $middleware->web(append: [\App\Http\Middleware\NoIndexDev::class]);
        $middleware->api(append: [\App\Http\Middleware\NoIndexDev::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Render JSON for API routes AND for requests expecting JSON (includes Fortify routes)
        $exceptions->shouldRenderJsonWhen(function (Request $request, Throwable $e) {
            return $request->is('api/*') || $request->expectsJson();
        });

        // Ensure API requests return 401 JSON instead of redirecting to a non-existent login route
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });

        // Handle email transport exceptions gracefully
        $exceptions->render(function (Throwable $e, Request $request) {
            // Check if it's a mail transport exception (check the whole exception chain)
            $currentException = $e;
            $isMailException = false;

            // Walk through exception chain to find mail-related exceptions
            do {
                if ($currentException instanceof \Swift_TransportException ||
                    $currentException instanceof \Symfony\Component\Mailer\Exception\TransportExceptionInterface ||
                    str_contains($currentException->getMessage(), 'Connection could not be established') ||
                    str_contains($currentException->getMessage(), 'stream_socket_client()') ||
                    str_contains(get_class($currentException), 'Swift') ||
                    str_contains(get_class($currentException), 'Mailer')) {
                    $isMailException = true;
                    break;
                }
                $currentException = $currentException->getPrevious();
            } while ($currentException !== null);

            if ($isMailException) {
                \Log::error('Email transport error', [
                    'url' => $request->fullUrl(),
                    'error' => $e->getMessage(),
                    'class' => get_class($e),
                    'trace' => $e->getTraceAsString(),
                ]);

                if ($request->is('api/*') || $request->expectsJson()) {
                    return response()->json([
                        'message' => 'We are unable to send email at the moment. Please try again later.',
                    ], 500);
                }
            }
        });
    })
    ->withProviders([
        App\Providers\ImageServiceProvider::class,
    ])->create();
