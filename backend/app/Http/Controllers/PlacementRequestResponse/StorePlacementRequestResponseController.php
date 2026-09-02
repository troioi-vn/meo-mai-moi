<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementRequestResponse;

use App\Enums\NotificationType;
use App\Enums\PlacementResponseStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\PlacementRequestResponseResource;
use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\PetAccessService;
use App\Services\QuickHelperProfileService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/placement-requests/{id}/responses',
    summary: 'Respond to a placement request',
    tags: ['Placement Request Responses'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the placement request',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    requestBody: new OA\RequestBody(
        required: false,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'message', type: 'string', example: 'I can help with this pet!', maxLength: 1000),
                new OA\Property(property: 'helper_profile_id', type: 'integer', example: 1, description: 'Optional helper profile ID if user has multiple'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'Response submitted successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(property: 'data', ref: '#/components/schemas/PlacementRequestResponse'),
                    new OA\Property(property: 'message', type: 'string', example: 'Response submitted successfully.'),
                ]
            )
        ),
        new OA\Response(response: 403, description: 'Forbidden - Request not active or helper blocked'),
        new OA\Response(response: 404, description: 'Placement request not found'),
    ]
)]
class StorePlacementRequestResponseController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService,
        protected QuickHelperProfileService $quickHelperProfileService,
        protected PetAccessService $petAccess,
    ) {}

    public function __invoke(Request $request, int $placementRequestId): JsonResponse
    {
        $placementRequest = PlacementRequest::find($placementRequestId);
        if (! $placementRequest) {
            return $this->sendError(__('messages.placement.not_found'), 404);
        }
        /** @var PlacementRequest $placementRequest */
        if (! $placementRequest->isActive()) {
            return $this->sendError(__('messages.placement.not_active'), 403);
        }

        /** @var User $user */
        $user = Auth::user();

        // Nobody can offer to take in their own pet. Checked before anything is
        // created, so a self-response never leaves a stub profile behind.
        //
        // Pet ownership is checked as well as the request's author: the two are
        // normally the same person, but only the former is what actually makes
        // this self-dealing. Until quick responses existed this was masked by the
        // helper profile requirement, which refused the owner for its own reason.
        if ($placementRequest->pet && $this->petAccess->canManagePlacements($user, $placementRequest->pet)) {
            return $this->sendError(__('messages.placement.cannot_self_respond'), 403);
        }

        $validatedData = $request->validate([
            'message' => 'nullable|string|max:1000',
            'helper_profile_id' => 'nullable|integer',
            'phone_number' => 'nullable|string|max:20|regex:/^[\d\s\-\+\(\)]+$/',
        ]);

        $helperProfileId = $validatedData['helper_profile_id'] ?? null;

        // One response per user per request, across all of their profiles.
        // canHelperRespond() below is keyed on a single profile id, which stopped
        // being enough once profiles can be created automatically.
        if ($placementRequest->hasActiveResponseFromUser($user->id)) {
            return $this->sendError(__('messages.placement.already_responded'), 409);
        }

        // A rejection follows the person, not the profile. Without this, archiving
        // a rejected profile and quick-responding again would reset the block.
        if ($placementRequest->isUserBlocked($user->id)) {
            return $this->sendError(__('messages.placement.cannot_respond'), 403);
        }

        /** @var HelperProfile|null $helperProfile */
        $helperProfile = null;

        if ($helperProfileId !== null) {
            $helperProfile = $user->helperProfiles()->find($helperProfileId);

            if (! $helperProfile) {
                return $this->sendError(__('messages.placement.invalid_helper_profile'), 403);
            }
        } else {
            // ->active() matches what can_respond reports. Without it an archived
            // profile is refused by the UI and accepted by the API.
            $helperProfile = $user->helperProfiles()->active()->first();
        }

        // Adoption and free fostering can be answered without a profile; paid
        // fostering and pet sitting still need one.
        if (! $helperProfile && ! $placementRequest->allowsQuickResponse()) {
            return $this->sendError(__('messages.placement.helper_profile_required'), 403);
        }

        if ($helperProfile && ! $placementRequest->canHelperRespond($helperProfile->id)) {
            if ($placementRequest->isHelperBlocked($helperProfile->id)) {
                return $this->sendError(__('messages.placement.cannot_respond'), 403);
            }

            if ($placementRequest->hasResponseFrom($helperProfile->id)) {
                return $this->sendError(__('messages.placement.already_responded'), 409);
            }

            return $this->sendError(__('messages.placement.cannot_respond'), 403);
        }

        // Profile creation and the response go in together, so a failure here
        // cannot leave an orphan profile behind for a response that never existed.
        $helperProfileId = $helperProfile?->id;
        $helperProfileWasCreated = $helperProfile === null;

        $response = DB::transaction(function () use (
            &$helperProfileId,
            $user,
            $placementRequest,
            $helperProfile,
            $validatedData
        ): PlacementRequestResponse {
            $profile = $helperProfile ?? $this->quickHelperProfileService->resolveForRequest(
                $user,
                $placementRequest,
                $validatedData['phone_number'] ?? null,
            );

            $helperProfileId = $profile->id;

            return PlacementRequestResponse::create([
                /** @phpstan-ignore-next-line */
                'placement_request_id' => $placementRequest->id,
                'helper_profile_id' => $profile->id,
                'status' => PlacementResponseStatus::RESPONDED,
                'message' => $validatedData['message'] ?? null,
                'responded_at' => now(),
            ]);
        });

        // Send notification to pet owner
        $pet = $placementRequest->pet;
        $this->notificationService->send(
            $placementRequest->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [
                'message' => $user->name.' wants to help with '.$pet->name.'. Review their response!',
                'link' => '/requests/'.$placementRequest->id,
                'helper_name' => $user->name,
                'pet_name' => $pet->name,
                'pet_id' => $pet->id,
                'placement_request_id' => $placementRequest->id,
                'placement_response_id' => $response->id,
            ]
        );

        // Receipts for the responder. In-app only via sendInApp(): emailing someone
        // about their own click is noise, and these are not user-configurable.
        // They exist so the fact outlives the toast that announced it.
        $this->notificationService->sendInApp(
            $user,
            NotificationType::OWN_PLACEMENT_RESPONSE->value,
            [
                'message' => __('messages.placement.receipts.responded', ['pet' => $pet->name]),
                'link' => '/requests/'.$placementRequest->id,
                'pet_name' => $pet->name,
                'placement_request_id' => $placementRequest->id,
                'placement_response_id' => $response->id,
            ]
        );

        // Only when one was actually made for them: somebody who already had a
        // profile has nothing new to be told about.
        if ($helperProfileWasCreated) {
            $this->notificationService->sendInApp(
                $user,
                NotificationType::HELPER_PROFILE_AUTO_CREATED->value,
                [
                    'message' => __('messages.placement.receipts.profile_created'),
                    'link' => '/helper/'.$helperProfileId,
                    'helper_profile_id' => $helperProfileId,
                ]
            );
        }

        return $this->sendSuccess(
            new PlacementRequestResponseResource($response),
            201
        );
    }
}
