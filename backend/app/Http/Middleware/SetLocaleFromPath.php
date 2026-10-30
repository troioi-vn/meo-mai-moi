<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\Seo\LocaleUrlService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Honours the locale named in the URL on the public shell routes.
 *
 * Applied per-route rather than to the whole web group, so it runs after
 * SetLocaleMiddleware and wins. That order is the point: a crawler fetching
 * /vi/requests/3 with `Accept-Language: en` must get Vietnamese, or the
 * hreflang alternates promise a translation the page does not deliver.
 */
class SetLocaleFromPath
{
    public function __construct(private readonly LocaleUrlService $localeUrls) {}

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->localeUrls->fromPath($request->path());

        if ($locale !== null) {
            App::setLocale($locale);
        }

        return $next($request);
    }
}
