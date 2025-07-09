<?php

namespace App\Http\Controllers;

use OpenApi\Annotations as OA;

/**
 * @OA\Info(
 *      version="1.0.0",
 *      title="Meo Mai Moi API Documentation",
 *      description="API Documentation for the Meo Mai Moi application",
 *      @OA\Contact(
 *          email="admin@example.com"
 *      )
 * )
 *
 * @OA\Server(
 *      url=L5_SWAGGER_CONST_HOST,
 *      description="Meo Mai Moi API Server"
 * )
 *
 * @OA\SecurityScheme(
 *     securityScheme="sanctum",
 *     type="http",
 *     description="Laravel Sanctum authentication",
 *     scheme="bearer",
 *     bearerFormat="Passport"
 * )
 */
abstract class Controller
{
    //
}
