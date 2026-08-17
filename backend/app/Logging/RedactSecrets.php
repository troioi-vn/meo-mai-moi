<?php

declare(strict_types=1);

namespace App\Logging;

use App\Services\Telegram\TelegramTokenRedactor;
use Illuminate\Log\Logger;
use Monolog\LogRecord;

/**
 * Channel tap that strips credentials from log records.
 *
 * Explicit call sites redact their own payloads, but exceptions thrown outside
 * a catch block are logged by the framework with the raw message. This is the
 * backstop for those.
 */
class RedactSecrets
{
    public function __invoke(Logger $logger): void
    {
        $monolog = $logger->getLogger();

        if (! $monolog instanceof \Monolog\Logger) {
            return;
        }

        $monolog->pushProcessor(static fn (LogRecord $record): LogRecord => $record->with(
            message: TelegramTokenRedactor::redact($record->message),
            context: TelegramTokenRedactor::redactContext($record->context),
        ));
    }
}
