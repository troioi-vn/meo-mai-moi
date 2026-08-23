<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

/**
 * Thrown when an MCP bearer-token client attempts to create a duplicate pet
 * (same name+species+owner) without allow_duplicate=true.
 */
final class DuplicatePetException extends Exception
{
    /**
     * @param  list<int>  $existingPetIds
     */
    public function __construct(
        public readonly array $existingPetIds,
        string $message = 'A pet with the same name and species already exists.',
    ) {
        parent::__construct($message);
    }
}
