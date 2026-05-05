<?php

declare(strict_types=1);

namespace App\Services\EmailConfiguration;

use App\Models\EmailConfiguration;

class MailConfigBuilder
{
    /**
     * @return array<string, mixed>
     */
    public function build(EmailConfiguration $configuration): array
    {
        $config = $configuration->config;

        $result = match ($configuration->provider) {
            'smtp' => [
                'default' => 'smtp',
                'mailers' => [
                    'smtp' => [
                        'transport' => 'smtp',
                        'host' => $config['host'],
                        'port' => $config['port'],
                        'encryption' => $config['encryption'],
                        'username' => $config['username'],
                        'password' => $config['password'],
                        'timeout' => null,
                        'local_domain' => config('mail.mailers.smtp.local_domain'),
                    ],
                ],
                'from' => $this->fromAddress($configuration),
            ],
            'mailgun' => [
                'default' => 'mailgun',
                'mailers' => [
                    'mailgun' => [
                        'transport' => 'mailgun',
                    ],
                ],
                'services' => [
                    'mailgun' => [
                        'domain' => $config['domain'],
                        'secret' => $config['api_key'],
                        'endpoint' => $config['endpoint'] ?? 'api.mailgun.net',
                        'scheme' => config('services.mailgun.scheme', 'https'),
                        'webhook_signing_key' => $config['webhook_signing_key'] ?? config('services.mailgun.webhook_signing_key'),
                    ],
                ],
                'from' => $this->fromAddress($configuration),
            ],
            default => throw new \InvalidArgumentException("Unsupported email provider: {$configuration->provider}"),
        };

        if ($configuration->provider === 'smtp') {
            $result['transport'] = 'smtp';
            $result['host'] = $config['host'];
            $result['port'] = $config['port'];
            $result['encryption'] = $config['encryption'];
        } elseif ($configuration->provider === 'mailgun') {
            $result['transport'] = 'mailgun';
            $result['domain'] = $config['domain'];
            $result['secret'] = $config['api_key'];
            $result['endpoint'] = $config['endpoint'] ?? 'api.mailgun.net';
            if (! empty($config['webhook_signing_key'])) {
                $result['webhook_signing_key'] = $config['webhook_signing_key'];
            }
        }

        return $result;
    }

    /**
     * @return array{address: mixed, name: mixed}
     */
    public function fromAddress(EmailConfiguration $configuration): array
    {
        $config = $configuration->config;

        return [
            'address' => $config['from_address'],
            'name' => $config['from_name'] ?? config('app.name'),
        ];
    }
}