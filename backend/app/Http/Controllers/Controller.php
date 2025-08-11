<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

/**
 * @OA\Info(
 *      version="1.0.0",
 *      title="Meo Mai Moi API Documentation",
 *      description="API documentation for the Meo Mai Moi application.",
 *      @OA\Contact(
 *          email="admin@meomaimoi.com"
 *      ),
 *      @OA\License(
 *          name="Apache 2.0",
 *          url="http://www.apache.org/licenses/LICENSE-2.0.html"
 *      )
 * )
 *
 * @OA\Schema(
 *     schema="Pagination",
 *     title="Pagination",
 *     description="Pagination object",
 *     @OA\Property(property="current_page", type="integer", description="Current page number"),
 *     @OA\Property(property="data", type="array", @OA\Items(type="object"), description="List of items on the current page"),
 *     @OA\Property(property="first_page_url", type="string", description="URL of the first page"),
 *     @OA\Property(property="from", type="integer", description="The starting number of the items on the current page"),
 *     @OA\Property(property="last_page", type="integer", description="The last page number"),
 *     @OA\Property(property="last_page_url", type="string", description="URL of the last page"),
 *     @OA\Property(property="links", type="array", @OA\Items(type="object"), description="List of pagination links"),
 *     @OA\Property(property="next_page_url", type="string", nullable=true, description="URL of the next page"),
 *     @OA\Property(property="path", type="string", description="Base URL for the paginator"),
 *     @OA\Property(property="per_page", type="integer", description="Number of items per page"),
 *     @Oa\Property(property="prev_page_url", type="string", nullable=true, description="URL of the previous page"),
 *     @OA\Property(property="to", type="integer", description="The ending number of the items on the current page"),
 *     @OA\Property(property="total", type="integer", description="Total number of items")
 * )
 */
abstract class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;
}
