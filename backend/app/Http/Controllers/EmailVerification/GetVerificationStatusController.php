<?php

declare(strict_types=1);

namespace App\Http\Controllers\EmailVerification;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/email/verification-status',
    summary: 'Check email verification status',
    description: "Check if the authenticated user's email is verified.",
    tags: ['Email Verification'],
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Verification status',
            content: new OA\JsonContent(ref: '#/components/schemas/VerificationStatusResponse')
        ),
    ]
)]
class GetVerificationStatusController extends Controller
{
    use ApiResponseTrait;

    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function __invoke(Request $request)
    {
        $user = $request->user();

        return $this->sendSuccess([
            'verified' => $user->hasVerifiedEmail(),
            'email' => $user->email,
        ]);
    }
}
