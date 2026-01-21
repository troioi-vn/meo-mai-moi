<?php

declare(strict_types=1);

namespace App\OpenApi;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    title: 'Meo Mai Moi API',
    description: 'API for Meo Mai Moi, a cat care management platform.',
    contact: new OA\Contact(email: 'support@meomaimoi.com')
)]
#[OA\Server(
    url: 'http://localhost:8000',
    description: 'Development server'
)]
class OpenApiSpec
{
}
