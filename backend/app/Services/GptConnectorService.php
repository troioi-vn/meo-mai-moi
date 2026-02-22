<?php

declare(strict_types=1);

namespace App\Services;

class GptConnectorService
{
    public function isValidSessionSignature(string $sessionId, string $sessionSignature): bool
    {
        $secret = (string) config('services.gpt_connector.hmac_secret', '');
        if ($secret === '') {
            return false;
        }

        $expected = hash_hmac('sha256', $sessionId, $secret);

        return hash_equals(strtolower($expected), strtolower($sessionSignature));
    }

    public function callbackUrl(string $sessionId, string $authCode): string
    {
        $baseUrl = rtrim((string) config('services.gpt_connector.url', ''), '/');

        return sprintf(
            '%s/oauth/callback?session_id=%s&code=%s',
            $baseUrl,
            urlencode($sessionId),
            urlencode($authCode)
        );
    }
}
