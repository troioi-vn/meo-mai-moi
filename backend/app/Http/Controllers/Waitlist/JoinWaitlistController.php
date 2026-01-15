<?php

namespace App\Http\Controllers\Waitlist;

use App\Http\Controllers\Controller;
use App\Services\WaitlistService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesErrors;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: "/api/waitlist",
    summary: "Join the waitlist",
    description: "Add an email address to the waitlist when invite-only mode is active.",
    tags: ["Waitlist"],
    requestBody: new OA\RequestBody(
        required: true,
        description: "Email address to add to waitlist",
        content: new OA\JsonContent(
            required: ["email"],
            properties: [
                new OA\Property(property: "email", type: "string", format: "email", example: "user@example.com")
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: "Successfully added to waitlist",
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: "message", type: "string", example: "Successfully added to waitlist"),
                    new OA\Property(property: "data", type: "object", properties: [
                        new OA\Property(property: "email", type: "string", example: "user@example.com"),
                        new OA\Property(property: "status", type: "string", example: "pending"),
                        new OA\Property(property: "created_at", type: "string", format: "datetime")
                    ])
                ]
            )
        ),
        new OA\Response(
            response: 422,
            description: "Validation error",
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: "message", type: "string", example: "The email has already been taken."),
                    new OA\Property(property: "errors", type: "object")
                ]
            )
        ),
        new OA\Response(
            response: 409,
            description: "Email already exists",
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: "message", type: "string", example: "Email is already registered or on waitlist")
                ]
            )
        )
    ]
)]
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
