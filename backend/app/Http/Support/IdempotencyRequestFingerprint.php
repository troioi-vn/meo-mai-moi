<?php

declare(strict_types=1);

namespace App\Http\Support;

use Illuminate\Http\Request;

class IdempotencyRequestFingerprint
{
    public static function forRequest(Request $request): string
    {
        $parts = [
            strtoupper($request->method()),
            '/'.$request->path(),
        ];

        $payload = self::normalizedPayload($request);
        if ($payload !== '') {
            $parts[] = $payload;
        }

        return implode("\n", $parts);
    }

    private static function normalizedPayload(Request $request): string
    {
        $content = $request->getContent();

        if (is_string($content) && $content !== '') {
            $decoded = json_decode($content, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return self::encodeSorted($decoded);
            }

            return hash('sha256', $content);
        }

        if ($request->request->count() > 0) {
            return self::encodeSorted($request->request->all());
        }

        if ($request->query->count() > 0) {
            return self::encodeSorted($request->query->all());
        }

        return '';
    }

    /**
     * @param  array<mixed>  $data
     */
    private static function encodeSorted(array $data): string
    {
        self::sortRecursive($data);

        return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '';
    }

    /**
     * @param  array<mixed>  $data
     */
    private static function sortRecursive(array &$data): void
    {
        ksort($data);

        foreach ($data as &$value) {
            if (is_array($value)) {
                self::sortRecursive($value);
            }
        }
    }
}
