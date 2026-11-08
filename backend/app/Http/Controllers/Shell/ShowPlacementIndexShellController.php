<?php

declare(strict_types=1);

namespace App\Http\Controllers\Shell;

use App\Http\Controllers\Concerns\ServesSpaShell;
use App\Http\Controllers\Controller;
use App\Services\Seo\ShellMetaService;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ShowPlacementIndexShellController extends Controller
{
    use ServesSpaShell;

    public function __construct(private readonly ShellMetaService $meta) {}

    public function __invoke(Request $request): View|RedirectResponse
    {
        return $this->frontendHandoff($request)
            ?? $this->shell($this->meta->forPlacementIndex($request->url()));
    }
}
