<?php

declare(strict_types=1);

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/users/me/avatar',
    summary: "Upload or update authenticated user's avatar",
    tags: ['User Profile'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\MediaType(
            mediaType: 'multipart/form-data',
            schema: new OA\Schema(
                properties: [
                    new OA\Property(
                        property: 'avatar',
                        type: 'string',
                        format: 'binary',
                        description: 'The avatar image file (max 2MB, jpeg, png, jpg, gif, svg)'
                    ),
                ]
            )
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Avatar uploaded successfully',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(
                        property: 'data',
                        type: 'object',
                        properties: [
                            new OA\Property(property: 'message', type: 'string', example: 'Avatar uploaded successfully'),
                            new OA\Property(property: 'user', ref: '#/components/schemas/User'),
                            new OA\Property(property: 'avatar_url', type: 'string', example: 'http://localhost:8000/storage/users/avatars/user_1_1678886400.png'),
                            new OA\Property(property: 'media_count', type: 'integer', example: 1),
                        ]
                    ),
                ]
            )
        ),
        new OA\Response(
            response: 422,
            description: 'Validation error',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string', example: 'Validation Error'),
                    new OA\Property(property: 'errors', type: 'object', example: ['avatar' => ['The avatar must be an image.']]),
                ]
            )
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
    ]
)]
class UploadAvatarController extends Controller
{
    use ApiResponseTrait;

    private const MAX_AVATAR_FILE_SIZE_KB = 2048;

    public function __invoke(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:'.self::MAX_AVATAR_FILE_SIZE_KB,
        ]);

        $user = $request->user();

        // Clear existing avatar
        $user->clearMediaCollection('avatar');

        // Add new avatar to MediaLibrary
        $user->addMediaFromRequest('avatar')
            ->toMediaCollection('avatar');

        // Refresh user to get updated avatar_url from accessor
        $user->refresh();

        return $this->sendSuccess([
            'message' => 'Avatar uploaded successfully',
            'user' => $user,
            'avatar_url' => $user->avatar_url,
            'media_count' => $user->getMedia('avatar')->count(),
        ]);
    }
}
