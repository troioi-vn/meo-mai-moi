<?php

declare(strict_types=1);

namespace App\Http\Controllers\Waitlist;

use App\Http\Controllers\Controller;
use App\Services\WaitlistService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

/**
 * Check if an email is on the waitlist (for frontend validation)
 */
class CheckWaitlistController extends Controller
{
    use ApiResponseTrait;
    use HandlesValidation;

    public function __construct(
        private WaitlistService $waitlistService
    ) {}

    #[OA\Post(
        path: '/api/waitlist/check',
        summary: 'Check waitlist status of an email',
        tags: ['Waitlist'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@example.com'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Waitlist status result',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [
                        new OA\Property(property: 'data', properties: [
                            new OA\Property(property: 'email', type: 'string'),
                            new OA\Property(property: 'on_waitlist', type: 'boolean'),
                            new OA\Property(property: 'is_registered', type: 'boolean'),
                            new OA\Property(property: 'can_join_waitlist', type: 'boolean'),
                        ], type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
    public function __invoke(Request $request)
    {
        $this->validateWithErrorHandling($request, [
            'email' => $this->emailValidationRules(),
        ]);

        $email = $request->input('email');
        $isOnWaitlist = $this->waitlistService->isEmailOnWaitlist($email);
        $isRegistered = $this->waitlistService->isEmailRegistered($email);

        return $this->sendSuccess([
            'email' => $email,
            'on_waitlist' => $isOnWaitlist,
            'is_registered' => $isRegistered,
            'can_join_waitlist' => ! $isOnWaitlist && ! $isRegistered,
        ]);
    }
}
