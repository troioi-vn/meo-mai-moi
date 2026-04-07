<?php

use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\AppVersionHeader;
use App\Http\Middleware\EnforceDailyApiQuota;
use App\Http\Middleware\EnforcePhotoStorageLimit;
use App\Http\Middleware\EnsureUserNotBanned;
use App\Http\Middleware\LogApiRequest;
use App\Http\Middleware\NoIndexDev;
use App\Http\Middleware\OptionalAuth;
use App\Http\Middleware\RejectPersonalAccessTokenAuth;
use App\Http\Middleware\RequireApiTokenAbility;
use App\Http\Middleware\SetLocaleMiddleware;
use App\Http\Middleware\ValidateGptConnectorApiKey;
use App\Http\Middleware\ValidateInvitationRequest;
use App\Providers\ImageServiceProvider;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(HandleCors::class);

        $middleware->web(append: [
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Email unsubscribe links carry their own signed bearer-style token.
        // Exempt the confirm endpoint from session CSRF so it works in mail clients
        // and browsers without having to bootstrap a Sanctum XSRF cookie first.
        $middleware->validateCsrfTokens(except: [
            'api/unsubscribe',
        ]);

        // For API requests, don't redirect unauthenticated users to a login route.
        // Returning null here ensures a 401 JSON response instead of an HTML redirect.
        $middleware->redirectGuestsTo(fn () => null);

        $middleware->alias([
            'admin' => AdminMiddleware::class,
            'gpt.connector' => ValidateGptConnectorApiKey::class,
            'not.banned' => EnsureUserNotBanned::class,
            'optional.auth' => OptionalAuth::class,
            'reject.pat' => RejectPersonalAccessTokenAuth::class,
            'require.pat.ability' => RequireApiTokenAbility::class,
            'validate.invitation' => ValidateInvitationRequest::class,
            'verified' => EnsureEmailIsVerified::class,
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

        // Enforce per-user photo storage limits on all API image uploads
        $middleware->api(append: [EnforcePhotoStorageLimit::class]);

        // Persist API usage metadata for admin monitoring and support triage
        // Keep this outside the quota middleware so 429 responses are logged too.
        $middleware->api(append: [LogApiRequest::class]);

        // Enforce daily per-user API quota (Regular plan), reset at UTC day boundary
        $middleware->api(append: [EnforceDailyApiQuota::class]);

        // Attach X-App-Version header so the frontend can detect new deploys
        $middleware->api(append: [AppVersionHeader::class]);

        // Append noindex headers for non-production / dev subdomains to reduce risk of Safe Browsing flags
        $middleware->web(append: [NoIndexDev::class]);
        $middleware->api(append: [NoIndexDev::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $isApiJsonRequest = static fn (Request $request): bool => $request->is('api/*') || $request->expectsJson();
        $errorEnvelope = static function (string $message, int $statusCode, array $extra = [], array $headers = []) {
            return response()->json(array_merge([
                'success' => false,
                'data' => null,
                'message' => $message,
                'error' => $message,
            ], $extra), $statusCode, $headers);
        };

        // Render JSON for API routes AND for requests expecting JSON (includes Fortify routes)
        $exceptions->shouldRenderJsonWhen(function (Request $request, Throwable $e) {
            return $request->is('api/*') || $request->expectsJson();
        });

        // Ensure API requests return 401 JSON instead of redirecting to a non-existent login route
        $exceptions->render(function (AuthenticationException $e, Request $request) use ($isApiJsonRequest, $errorEnvelope) {
            if ($isApiJsonRequest($request)) {
                return $errorEnvelope(__('messages.unauthenticated'), 401);
            }
        });

        $exceptions->render(function (ValidationException $e, Request $request) use ($isApiJsonRequest, $errorEnvelope) {
            if ($isApiJsonRequest($request)) {
                if ($e->response !== null) {
                    return $e->response;
                }

                return $errorEnvelope($e->getMessage(), 422, [
                    'errors' => $e->errors(),
                ]);
            }
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) use ($isApiJsonRequest, $errorEnvelope) {
            if ($isApiJsonRequest($request)) {
                $message = trim((string) $e->getMessage()) !== '' ? $e->getMessage() : __('messages.forbidden');

                return $errorEnvelope($message, 403);
            }
        });

        $exceptions->render(function (ModelNotFoundException|NotFoundHttpException $e, Request $request) use ($isApiJsonRequest, $errorEnvelope) {
            if ($isApiJsonRequest($request)) {
                return $errorEnvelope(__('messages.not_found'), 404);
            }
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) use ($isApiJsonRequest, $errorEnvelope) {
            if ($isApiJsonRequest($request) && $e->getStatusCode() === 429) {
                $message = trim($e->getMessage()) !== '' ? $e->getMessage() : 'Too Many Requests.';

                return $errorEnvelope($message, 429, headers: $e->getHeaders());
            }
        });

        // Handle email transport exceptions gracefully
        $exceptions->render(function (Throwable $e, Request $request) use ($isApiJsonRequest, $errorEnvelope) {
            // Check if it's a mail transport exception (check the whole exception chain)
            $currentException = $e;
            $isMailException = false;

            // Walk through exception chain to find mail-related exceptions
            do {
                if ($currentException instanceof Swift_TransportException ||
                    $currentException instanceof TransportExceptionInterface ||
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
                Log::error('Email transport error', [
                    'url' => $request->fullUrl(),
                    'error' => $e->getMessage(),
                    'class' => get_class($e),
                    'trace' => $e->getTraceAsString(),
                ]);

                if ($isApiJsonRequest($request)) {
                    return $errorEnvelope(__('messages.email.send_failed'), 500);
                }
            }
        });
    })
    ->withProviders([
        ImageServiceProvider::class,
    ])->create();
