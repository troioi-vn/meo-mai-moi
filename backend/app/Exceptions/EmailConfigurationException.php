<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

class EmailConfigurationException extends Exception
{
    /**
     * @var list<string>
     */
    protected array $validationErrors;

    /**
     * @param list<string> $validationErrors
     */
    public function __construct(string $message, array $validationErrors = [], int $code = 0, ?Exception $previous = null)
    {
        parent::__construct($message, $code, $previous);
        $this->validationErrors = $validationErrors;
    }

    /**
     * Get validation errors.
        *
        * @return list<string>
     */
    public function getValidationErrors(): array
    {
        return $this->validationErrors;
    }

    /**
     * Get formatted error message for display.
     */
    public function getFormattedMessage(): string
    {
        $message = $this->getMessage();

        if (! empty($this->validationErrors)) {
            $message .= "\n\nValidation Errors:\n• ".implode("\n• ", $this->validationErrors);
        }

        return $message;
    }

    /**
     * Check if this exception has validation errors.
     */
    public function hasValidationErrors(): bool
    {
        return ! empty($this->validationErrors);
    }

    /**
     * Get the first validation error.
     */
    public function getFirstValidationError(): ?string
    {
        return $this->validationErrors[0] ?? null;
    }
}
