<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ErrorEvent;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class ErrorEventService
{
    private static bool $recording = false;

    /**
     * @param  array{route?: string|null, method?: string|null, status_code?: int|null, user_id?: int|string|null, context?: array<string, mixed>|null}  $requestContext
     */
    public function recordBackend(Throwable $exception, array $requestContext = []): ?ErrorEvent
    {
        if (! $this->shouldRecord($exception)) {
            return null;
        }

        return $this->recordSafely([
            'source' => 'backend',
            'message' => $exception->getMessage() !== '' ? $exception->getMessage() : $exception::class,
            'exception_class' => $exception::class,
            'stack' => $exception->getTraceAsString(),
            'route' => $requestContext['route'] ?? 'console',
            'method' => $requestContext['method'] ?? null,
            'status_code' => $requestContext['status_code'] ?? $this->statusCode($exception),
            'app_version' => (string) config('version.api'),
            'user_id' => $requestContext['user_id'] ?? null,
            'context' => $requestContext['context'] ?? null,
            'occurred_at' => now(),
            'frame' => $this->firstBackendFrame($exception),
        ]);
    }

    /**
     * @param  array{message: string, exception_class?: string|null, stack?: string|null, route: string, method?: string|null, status_code?: int|null, app_version?: string|null, user_id?: int|string|null, context?: array<string, mixed>|null, occurred_at?: string|Carbon|null}  $payload
     */
    public function recordFrontend(array $payload): ?ErrorEvent
    {
        $now = now();
        $occurredAt = isset($payload['occurred_at']) ? Carbon::parse($payload['occurred_at']) : $now;

        return $this->recordSafely([
            ...$payload,
            'source' => 'frontend',
            'occurred_at' => $occurredAt->isFuture() ? $now : $occurredAt,
            'frame' => $this->firstFrontendFrame($payload['stack'] ?? null),
        ]);
    }

    public function fingerprint(?string $exceptionClass, string $message, ?string $frame): string
    {
        $parts = [
            $this->normalize($exceptionClass ?? 'unknown'),
            $this->normalize($message),
            $this->normalize($frame ?? 'unknown'),
        ];

        return hash('sha256', implode('|', $parts));
    }

    public function shouldRecord(Throwable $exception): bool
    {
        if ($exception instanceof ValidationException
            || $exception instanceof AuthenticationException
            || $exception instanceof AuthorizationException
            || $exception instanceof ModelNotFoundException) {
            return false;
        }

        return ! ($exception instanceof HttpExceptionInterface && $exception->getStatusCode() < 500);
    }

    /** @param array<string, mixed> $attributes */
    private function recordSafely(array $attributes): ?ErrorEvent
    {
        if (self::$recording) {
            return null;
        }

        self::$recording = true;

        try {
            $frame = is_string($attributes['frame'] ?? null) ? $attributes['frame'] : null;
            unset($attributes['frame']);
            $attributes['fingerprint'] = $this->fingerprint(
                is_string($attributes['exception_class'] ?? null) ? $attributes['exception_class'] : null,
                (string) $attributes['message'],
                $frame,
            );

            return ErrorEvent::query()->create($attributes);
        } catch (Throwable $recordingFailure) {
            // The guard remains set while reporting, so a storage failure cannot recurse.
            report($recordingFailure);

            return null;
        } finally {
            self::$recording = false;
        }
    }

    private function statusCode(Throwable $exception): int
    {
        return $exception instanceof HttpExceptionInterface ? $exception->getStatusCode() : 500;
    }

    private function firstBackendFrame(Throwable $exception): string
    {
        $frames = [[
            'file' => $exception->getFile(),
            'class' => null,
            'function' => null,
        ], ...$exception->getTrace()];

        foreach ($frames as $frame) {
            $file = is_string($frame['file'] ?? null) ? $frame['file'] : '';
            if ($file !== '' && ! str_contains($file, DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR)) {
                return implode(':', array_filter([
                    $this->relativePath($file),
                    is_string($frame['class'] ?? null) ? $frame['class'] : null,
                    is_string($frame['function'] ?? null) ? $frame['function'] : null,
                ]));
            }
        }

        return $this->relativePath($exception->getFile());
    }

    private function firstFrontendFrame(?string $stack): ?string
    {
        if ($stack === null) {
            return null;
        }

        foreach (preg_split('/\R/', $stack) ?: [] as $line) {
            $line = trim($line);
            if ($line !== '' && (str_starts_with($line, 'at ') || str_contains($line, '@'))) {
                return $line;
            }
        }

        return null;
    }

    private function relativePath(string $path): string
    {
        $basePath = base_path().DIRECTORY_SEPARATOR;

        return str_starts_with($path, $basePath) ? substr($path, strlen($basePath)) : $path;
    }

    private function normalize(string $value): string
    {
        $value = mb_strtolower($value);
        $patterns = [
            '/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i' => '<uuid>',
            '/\b\d{4}-\d{2}-\d{2}[t ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:z|[+-]\d{2}:?\d{2})?\b/i' => '<timestamp>',
            '/\b0x[0-9a-f]+\b/i' => '<address>',
            '/(["\']).*?\1/u' => '<quoted>',
            '/\b\d+\b/' => '<number>',
            '/\s+/' => ' ',
        ];

        return trim((string) preg_replace(array_keys($patterns), array_values($patterns), $value));
    }
}
