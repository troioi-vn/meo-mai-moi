<?php

declare(strict_types=1);

namespace App\Http\Controllers\Shell;

use App\Http\Controllers\Concerns\ServesSpaShell;
use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use App\Services\Seo\ShellMetaService;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ShowHelperProfileShellController extends Controller
{
    use ServesSpaShell;

    public function __construct(private readonly ShellMetaService $meta) {}

    public function __invoke(Request $request, int $helperProfile): View|RedirectResponse
    {
        if ($handoff = $this->frontendHandoff($request)) {
            return $handoff;
        }

        // Same gate as GET /api/helpers, through the same scope: only a profile
        // its owner published and a moderator approved gets described in the
        // head. Anything else falls back to the plain shell rather than leaking
        // a withdrawn profile into every crawler that ever saw the link.
        $profile = HelperProfile::query()->publiclyVisible()->find($helperProfile);

        if ($profile === null) {
            return $this->shell();
        }

        return $this->shell($this->meta->forHelperProfile($profile, $request->url()));
    }
}
