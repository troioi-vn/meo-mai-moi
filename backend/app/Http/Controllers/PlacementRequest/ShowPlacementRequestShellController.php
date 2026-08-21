<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementRequest;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Http\Controllers\Controller;
use App\Models\PlacementRequest;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Serves the SPA shell for /requests/{id} with link-preview metadata filled in.
 *
 * This page is the one owners actually spread — on Zalo, Telegram, Facebook, or
 * a QR code taped to a carrier — and without og: tags every one of those shares
 * previewed as a blank card reading "Meo Mai Moi". The React app still renders
 * the page; this only populates the head that crawlers read.
 */
class ShowPlacementRequestShellController extends Controller
{
    public function __invoke(Request $request, int $placementRequest): View|RedirectResponse
    {
        $frontend = frontend_url();
        $frontendHost = parse_url($frontend, PHP_URL_HOST);

        // Same handoff the catch-all does when the SPA lives on another host.
        if (! serves_web_app() || $frontendHost !== $request->getHost()) {
            return redirect()->away(rtrim($frontend, '/').$request->getRequestUri());
        }

        $model = PlacementRequest::with('pet')->find($placementRequest);

        // Only open requests get a rich preview. A closed, deleted or private one
        // falls back to the plain shell rather than leaking a pet's details into
        // every crawler that ever saw the link.
        if (
            ! $model
            || $model->status !== PlacementRequestStatus::OPEN
            || $model->pet === null
        ) {
            return view('welcome');
        }

        $pet = $model->pet;

        return view('welcome', [
            'ogType' => 'article',
            'ogTitle' => $this->title($pet->name, $model->request_type),
            'ogDescription' => $this->description($model->notes),
            'ogImage' => $pet->photo_url,
            'ogUrl' => $request->url(),
        ]);
    }

    private function title(string $petName, PlacementRequestType $type): string
    {
        return match ($type) {
            PlacementRequestType::PERMANENT => __('messages.placement.og.permanent', ['name' => $petName]),
            PlacementRequestType::PET_SITTING => __('messages.placement.og.pet_sitting', ['name' => $petName]),
            default => __('messages.placement.og.foster', ['name' => $petName]),
        };
    }

    private function description(?string $notes): string
    {
        $fallback = __('messages.placement.og.fallback');

        if ($notes === null || trim($notes) === '') {
            return $fallback;
        }

        // Newlines break some crawlers' attribute parsing, and previews truncate
        // around 160 characters anyway.
        $flattened = trim((string) preg_replace('/\s+/u', ' ', $notes));

        return mb_strimwidth($flattened, 0, 160, '...');
    }
}
