<?php

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'Pagination',
    title: 'Pagination',
    description: 'Pagination object',
    properties: [
        new OA\Property(property: 'current_page', type: 'integer', description: 'Current page number'),
        new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object'), description: 'List of items on the current page'),
        new OA\Property(property: 'first_page_url', type: 'string', description: 'URL of the first page'),
        new OA\Property(property: 'from', type: 'integer', description: 'The starting number of the items on the current page'),
        new OA\Property(property: 'last_page', type: 'integer', description: 'The last page number'),
        new OA\Property(property: 'last_page_url', type: 'string', description: 'URL of the last page'),
        new OA\Property(property: 'links', type: 'array', items: new OA\Items(type: 'object'), description: 'List of pagination links'),
        new OA\Property(property: 'next_page_url', type: 'string', nullable: true, description: 'URL of the next page'),
        new OA\Property(property: 'path', type: 'string', description: 'Base URL for the paginator'),
        new OA\Property(property: 'per_page', type: 'integer', description: 'Number of items per page'),
        new OA\Property(property: 'prev_page_url', type: 'string', nullable: true, description: 'URL of the previous page'),
        new OA\Property(property: 'to', type: 'integer', description: 'The ending number of the items on the current page'),
        new OA\Property(property: 'total', type: 'integer', description: 'Total number of items'),
    ]
)]
class PaginationSchema {}
