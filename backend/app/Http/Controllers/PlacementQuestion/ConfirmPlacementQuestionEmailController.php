<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementQuestion;

use App\Exceptions\PlacementQuestionException;
use App\Http\Controllers\Controller;
use App\Models\PlacementQuestion;
use App\Services\Placement\PlacementQuestionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * The link in the asker's confirmation email.
 *
 * A web route rather than an API one, because the person clicking it is reading
 * their mail, not driving the SPA. It confirms and bounces them to the listing
 * with a flag the frontend turns into a toast.
 */
class ConfirmPlacementQuestionEmailController extends Controller
{
    public function __invoke(
        Request $request,
        PlacementQuestion $placementQuestion,
        PlacementQuestionService $service,
    ): RedirectResponse {
        $token = (string) $request->query('token', '');

        $destination = $placementQuestion->placement_request_id === null
            ? frontend_url().'/pets/'.$placementQuestion->pet_id
            : frontend_url().'/requests/'.$placementQuestion->placement_request_id;

        try {
            $service->confirmEmail($placementQuestion, $token);
        } catch (PlacementQuestionException) {
            return redirect()->away($destination.'?question_confirmed=0#questions');
        }

        return redirect()->away($destination.'?question_confirmed=1#questions');
    }
}
