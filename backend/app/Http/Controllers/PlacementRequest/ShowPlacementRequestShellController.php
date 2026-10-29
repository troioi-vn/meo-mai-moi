<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementRequest;

use App\Enums\PlacementRequestStatus;
use App\Http\Controllers\Concerns\ServesSpaShell;
use App\Http\Controllers\Controller;
use App\Models\PlacementRequest;
use App\Services\Seo\ShellMetaService;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
    use ServesSpaShell;

    public function __construct(private readonly ShellMetaService $meta) {}

    public function __invoke(Request $request, int $placementRequest): View|RedirectResponse
    {
        if ($handoff = $this->frontendHandoff($request)) {
            return $handoff;
        }

        $model = PlacementRequest::with([
            'pet',
            // Pet-scoped, matching what the page itself lists: an owner who
            // relists keeps the answers already written about this animal.
            'pet.placementQuestions' => fn (HasMany $query) => $query->published()
                ->orderBy('published_at')
                ->orderBy('id'),
        ])->find($placementRequest);

        // Only open requests get a rich preview. A closed, deleted or private one
        // falls back to the plain shell rather than leaking a pet's details into
        // every crawler that ever saw the link.
        if (
            ! $model
            || $model->status !== PlacementRequestStatus::OPEN
            || $model->pet === null
        ) {
            return $this->shell();
        }

        return $this->shell($this->meta->forPlacementRequest(
            placementRequest: $model,
            pet: $model->pet,
            url: $request->url(),
            publishedQuestions: $model->pet->placementQuestions,
        ));
    }
}
