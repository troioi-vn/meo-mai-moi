<?php

namespace App\Http\Controllers\Waitlist;

use App\Http\Controllers\Controller;
use App\Services\WaitlistService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesErrors;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;

/**
 * @OA\Post(
 *     path="/api/waitlist",
 *     summary="Join the waitlist",
 *     description="Add an email address to the waitlist when invite-only mode is active.",
 *     tags={"Waitlist"},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Email address to add to waitlist",
 *
 *         @OA\JsonContent(
 *             required={"email"},
 *
 *             @OA\Property(property="email", type="string", format="email", example="user@example.com")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=201,
 *         description="Successfully added to waitlist",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Successfully added to waitlist"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="email", type="string", example="user@example.com"),
 *                 @OA\Property(property="status", type="string", example="pending"),
 *                 @OA\Property(property="created_at", type="string", format="datetime")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="The email has already been taken."),
 *             @OA\Property(property="errors", type="object")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=409,
 *         description="Email already exists",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Email is already registered or on waitlist")
 *         )
 *     )
 * )
 */
class JoinWaitlistController extends Controller
{
    use ApiResponseTrait;
    use HandlesErrors;
    use HandlesValidation;

    public function __construct(
        private WaitlistService $waitlistService
    ) {}

    public function __invoke(Request $request)
    {
        return $this->handleAction(function () use ($request) {
            $this->validateWithErrorHandling($request, [
                'email' => $this->emailValidationRules(),
            ]);

            $email = strtolower($request->input('email'));

            // Validate email comprehensively
            $validationErrors = $this->waitlistService->validateEmailForWaitlist($email);

            if (! empty($validationErrors)) {
                return $this->handleBusinessError(
                    implode(', ', $validationErrors),
                    409
                );
            }

            // Add to waitlist
            $waitlistEntry = $this->waitlistService->addToWaitlist($email);

            return $this->sendSuccess([
                'email' => $waitlistEntry->email,
                'status' => $waitlistEntry->status,
                'created_at' => $waitlistEntry->created_at,
            ], 201);
        });
    }
}
