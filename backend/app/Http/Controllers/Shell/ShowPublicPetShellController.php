<?php

declare(strict_types=1);

namespace App\Http\Controllers\Shell;

use App\Http\Controllers\Concerns\ServesSpaShell;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Services\PetAccessService;
use App\Services\Seo\ShellMetaService;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ShowPublicPetShellController extends Controller
{
    use ServesSpaShell;

    public function __construct(
        private readonly ShellMetaService $meta,
        private readonly PetAccessService $petAccess,
    ) {}

    public function __invoke(Request $request, int $pet): View|RedirectResponse
    {
        if ($handoff = $this->frontendHandoff($request)) {
            return $handoff;
        }

        $model = Pet::query()->find($pet);

        // isPubliclyViewable is the guest half of PetPolicy::view: a pet is
        // described here only while it has an open listing or is reported lost.
        // A viewer who can see more because of a relationship gets that from the
        // API after sign-in, never from a crawlable head.
        if ($model === null || ! $this->petAccess->isPubliclyViewable($model)) {
            return $this->shell();
        }

        return $this->shell($this->meta->forPublicPet($model, $request->url()));
    }
}
