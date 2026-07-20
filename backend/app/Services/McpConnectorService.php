<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Str;

class McpConnectorService
{
    /** @var array<string, string> */
    private const SCOPE_ABILITIES = [
        'pets:read' => 'pets:read',
        'health:read' => 'health:read',
        'pets:write' => 'pet:write',
        'health:write' => 'health:write',
        'habits:read' => 'habits:read',
        'habits:write' => 'habits:write',
        'microchips:read' => 'microchips:read',
        'microchips:write' => 'microchips:write',
        'sharing:read' => 'sharing:read',
        'sharing:write' => 'sharing:write',
        'placement:read' => 'placement:read',
        'placement:write' => 'placement:write',
        'helpers:read' => 'helpers:read',
        'helpers:write' => 'helpers:write',
        'messages:read' => 'messages:read',
        'messages:write' => 'messages:write',
        'groups:read' => 'groups:read',
        'finance:read' => 'finance:read',
        'notifications:read' => 'notifications:read',
        'profile:read' => 'profile:read',
        'invitations:read' => 'invitations:read',
    ];

    /**
     * @return array{request_id:string,client_name:string,scopes:array<int,string>,exp:int}|null
     */
    public function parseAuthorizationReference(string $reference): ?array
    {
        $secret = (string) config('services.mcp_connector.hmac_secret', '');
        if ($secret === '' || ! str_contains($reference, '.')) {
            return null;
        }

        [$encoded, $signature] = explode('.', $reference, 2);
        $expected = $this->base64UrlEncode(hash_hmac('sha256', $encoded, $secret, true));
        if (! hash_equals($expected, $signature)) {
            return null;
        }

        $decoded = $this->base64UrlDecode($encoded);
        $payload = $decoded === null ? null : json_decode($decoded, true);
        if (! is_array($payload)) {
            return null;
        }

        $requestId = $payload['request_id'] ?? null;
        $clientName = $payload['client_name'] ?? null;
        $scopes = $payload['scopes'] ?? null;
        $expiresAt = $payload['exp'] ?? null;
        if (! is_string($requestId) || ! Str::isUuid($requestId)
            || ! is_string($clientName) || trim($clientName) === '' || mb_strlen($clientName) > 100
            || ! $this->hasValidScopes($scopes)
            || ! is_int($expiresAt) || $expiresAt < now()->timestamp || $expiresAt > now()->addMinutes(10)->timestamp) {
            return null;
        }

        return [
            'request_id' => $requestId,
            'client_name' => trim($clientName),
            'scopes' => $scopes,
            'exp' => $expiresAt,
        ];
    }

    /**
     * @param  array<int, string>  $scopes
     * @return list<string>
     */
    public function abilitiesForScopes(array $scopes): array
    {
        $abilities = [];
        foreach ($scopes as $scope) {
            if (! array_key_exists($scope, self::SCOPE_ABILITIES)) {
                throw new \InvalidArgumentException("Unsupported MCP scope: {$scope}");
            }
            $abilities[] = self::SCOPE_ABILITIES[$scope];
        }

        return array_values(array_unique($abilities));
    }

    public function callbackUrl(string $requestId, ?string $exchangeCode = null, ?string $error = null): string
    {
        $baseUrl = rtrim((string) config('services.mcp_connector.url', ''), '/');
        $parameters = ['request_id' => $requestId];
        if ($exchangeCode !== null) {
            $parameters['code'] = $exchangeCode;
        }
        if ($error !== null) {
            $parameters['error'] = $error;
        }

        return $baseUrl.'/oauth/meo/callback?'.http_build_query($parameters, '', '&', PHP_QUERY_RFC3986);
    }

    public function isEmailAllowed(string $email): bool
    {
        $allowlist = config('services.mcp_connector.allowed_emails', []);
        if (! is_array($allowlist)) {
            return false;
        }

        $normalized = mb_strtolower(trim($email));

        return in_array($normalized, array_map(
            static fn (mixed $value): string => mb_strtolower(trim((string) $value)),
            $allowlist
        ), true);
    }

    private function hasValidScopes(mixed $scopes): bool
    {
        if (! is_array($scopes) || ! array_is_list($scopes) || $scopes === []) {
            return false;
        }

        foreach ($scopes as $scope) {
            if (! is_string($scope) || ! array_key_exists($scope, self::SCOPE_ABILITIES)) {
                return false;
            }
        }

        return count($scopes) === count(array_unique($scopes));
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): ?string
    {
        $padding = (4 - strlen($value) % 4) % 4;
        $decoded = base64_decode(strtr($value.str_repeat('=', $padding), '-_', '+/'), true);

        return $decoded === false ? null : $decoded;
    }
}
