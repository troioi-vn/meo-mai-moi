<?php

namespace App\Http\Controllers;

use App\Services\WaitlistService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class WaitlistController extends Controller
{
    use ApiResponseTrait;

    private WaitlistService $waitlistService;

    public function __construct(WaitlistService $waitlistService)
    {
        $this->waitlistService = $waitlistService;
    }

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
    public function store(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
            ]);

            $email = strtolower($request->input('email'));

            // Validate email comprehensively
            $validationErrors = $this->waitlistService->validateEmailForWaitlist($email);

            if (!empty($validationErrors)) {
                return $this->sendError(
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
            ], 201, 'Successfully added to waitlist');

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to add to waitlist: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * Check if an email is on the waitlist (for frontend validation)
     */
    public function check(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $email = $request->input('email');
        $isOnWaitlist = $this->waitlistService->isEmailOnWaitlist($email);
        $isRegistered = $this->waitlistService->isEmailRegistered($email);

        return $this->sendSuccess([
            'email' => $email,
            'on_waitlist' => $isOnWaitlist,
            'is_registered' => $isRegistered,
            'can_join_waitlist' => !$isOnWaitlist && !$isRegistered,
        ]);
    }
}
