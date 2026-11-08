<?php

declare(strict_types=1);

namespace App\Http\Controllers\Concerns;

use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Shared plumbing for the routes that serve the SPA shell with real head
 * metadata instead of the catch-all's hardcoded title.
 *
 * The handoff is the same one the catch-all in routes/web.php performs: a
 * container that does not serve the web app, or one answering on a host other
 * than the frontend's, sends the visitor on rather than rendering a shell that
 * would load assets it does not have.
 */
trait ServesSpaShell
{
    protected function frontendHandoff(Request $request): ?RedirectResponse
    {
        $frontend = frontend_url();
        $frontendHost = parse_url($frontend, PHP_URL_HOST);

        if (! serves_web_app() || $frontendHost !== $request->getHost()) {
            return redirect()->away(rtrim($frontend, '/').$request->getRequestUri());
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    protected function shell(array $meta = []): View
    {
        /** @var view-string $view */
        $view = 'welcome';

        return view($view, $meta);
    }
}
