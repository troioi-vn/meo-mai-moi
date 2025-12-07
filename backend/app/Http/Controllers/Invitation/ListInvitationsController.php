<?php

namespace App\Http\Controllers\Invitation;

use App\Http\Controllers\Controller;
use App\Services\InvitationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/api/invitations",
 *     summary="Get user's sent invitations",
 *     description="Retrieve all invitations sent by the authenticated user.",
 *     tags={"Invitations"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="List of sent invitations",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="data", type="array",
 *
 *                 @OA\Items(type="object",
 *
 *                     @OA\Property(property="id", type="integer"),
 *                     @OA\Property(property="code", type="string"),
 *                     @OA\Property(property="status", type="string"),
 *                     @OA\Property(property="expires_at", type="string", format="datetime", nullable=true),
 *                     @OA\Property(property="created_at", type="string", format="datetime"),
 *                     @OA\Property(property="invitation_url", type="string"),
 *                     @OA\Property(property="recipient", type="object", nullable=true)
 *                 )
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     )
 * )
 */
class ListInvitationsController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private InvitationService $invitationService
    ) {
    }

    public function __invoke(Request $request)
    {
        $user = $request->user();
        $invitations = $this->invitationService->getUserInvitations($user);

        $data = [];
        foreach ($invitations as $invitation) {
            /** @var \App\Models\Invitation $invitation */
            $data[] = [
                'id' => $invitation->id,
                'code' => $invitation->code,
                'status' => $invitation->status,
                'expires_at' => $invitation->expires_at,
                'created_at' => $invitation->created_at,
                'invitation_url' => $invitation->getInvitationUrl(),
                'recipient' => $invitation->recipient ? [
                    'id' => $invitation->recipient->id,
                    'name' => $invitation->recipient->name,
                    'email' => $invitation->recipient->email,
                ] : null,
            ];
        }

        return $this->sendSuccess($data);
    }
}
