<?php

declare(strict_types=1);

namespace App\Services\Offline;

use InvalidArgumentException;

class InvalidIdempotencyKeyException extends InvalidArgumentException {}
